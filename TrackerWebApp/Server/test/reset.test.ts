import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../src/db/migrate.js';
import { seedDemo } from '../src/db/seed.js';
import { resetWorkspace } from '../src/db/reset.js';
import { readConfig } from '../src/config.js';
import { login } from '../src/services/users.js';
import { testDatabase } from './database.js';

test('explicit cleanup empties the workspace, preserves the admin and does not restore demo data', { timeout: 60000 }, async () => {
  const db = await testDatabase();
  try {
    await migrate(db.pool);
    const config = readConfig({ NODE_ENV: 'test', DATABASE_URL: db.url, ALLOW_DEMO_SEED: 'true' });
    await seedDemo(db.pool, config);
    await db.pool.query("UPDATE users SET display_name='Current Admin',theme='light',language='en' WHERE id='admin1'");
    const before = (await db.pool.query("SELECT * FROM users WHERE id='admin1'")).rows[0];
    await db.pool.query("UPDATE users SET is_admin=true WHERE id='u1'");
    await assert.rejects(resetWorkspace(db.pool), /Expected one administrator/);
    assert.equal((await db.pool.query('SELECT count(*)::int AS count FROM issues')).rows[0].count, 12);
    await db.pool.query("UPDATE users SET is_admin=false WHERE id='u1'");
    await assert.rejects(resetWorkspace(db.pool, 'u1'), /Expected one administrator/);
    const result = await resetWorkspace(db.pool);
    assert.deepEqual(result, { keptAdminId: 'admin1', deleted: { users: 5, queues: 3, issues: 12, comments: 9 }, remaining: { users: 1, queues: 0, issues: 0, comments: 0 } });
    const remaining = (await db.pool.query('SELECT * FROM users')).rows;
    assert.deepEqual(remaining, [{ ...before, theme: 'dark', language: 'ru' }]);
    for (const table of ['queues', 'issues', 'comments', 'activity_log', 'oauth_states', 'oauth_identities']) {
      assert.equal((await db.pool.query(`SELECT count(*)::int AS count FROM ${table}`)).rows[0].count, 0);
    }
    assert.equal((await login(db.pool, before.email, 'admin123', 168)).user.id, 'admin1');
    assert.equal((await seedDemo(db.pool, config)).seeded, false);
    assert.deepEqual((await resetWorkspace(db.pool)).deleted, { users: 0, queues: 0, issues: 0, comments: 0 });
    await db.pool.query("INSERT INTO users(id,email,display_name,initials,avatar) VALUES('new','new@example.com','New','NE','NE')");
    assert.deepEqual((await db.pool.query("SELECT theme,language FROM users WHERE id='new'")).rows[0], { theme: 'dark', language: 'ru' });
  } finally { await db.close(); }
});
