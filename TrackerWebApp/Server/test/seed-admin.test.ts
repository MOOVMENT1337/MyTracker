import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrate } from '../src/db/migrate.js';
import { seedAdmin, seedDemo } from '../src/db/seed.js';
import { readConfig } from '../src/config.js';
import { hashPassword, verifyPassword } from '../src/security.js';
import { testDatabase } from './database.js';

test('admin-only seed imports only the requested admin and never resets or restores accounts', { timeout: 60000 }, async () => {
  const db = await testDatabase();
  try {
    await migrate(db.pool);
    const config = readConfig({ NODE_ENV: 'test', DATABASE_URL: db.url, ALLOW_DEMO_SEED: 'true' });
    await assert.rejects(seedAdmin(db.pool, { ...config, NODE_ENV: 'production' }), /non-production/);
    await assert.rejects(seedAdmin(db.pool, { ...config, ALLOW_DEMO_SEED: 'false' }), /ALLOW_DEMO_SEED/);
    assert.deepEqual(await seedAdmin(db.pool, config), { seeded: true, users: 1, queues: 0, issues: 0 });
    const users = (await db.pool.query('SELECT * FROM users')).rows;
    assert.equal(users.length, 1);
    assert.equal(users[0].email, 'admin@tracker.com');
    assert.equal(users[0].is_admin, true);
    assert.equal(users[0].display_name, 'Admin');
    assert.equal(users[0].avatar_color, '#8B5CF6');
    assert.ok(await verifyPassword('admin123', users[0].password_hash));
    for (const table of ['queues', 'issues', 'comments']) {
      assert.equal(Number((await db.pool.query(`SELECT count(*) FROM ${table}`)).rows[0].count), 0);
    }
    const changedHash = await hashPassword('changed-admin-password');
    await db.pool.query("UPDATE users SET display_name='Changed Admin',password_hash=$1 WHERE id='admin1'", [changedHash]);
    assert.deepEqual(await seedAdmin(db.pool, config), { seeded: false });
    assert.equal((await db.pool.query("SELECT password_hash FROM users WHERE id='admin1'")).rows[0].password_hash, changedHash);
    assert.equal((await db.pool.query("SELECT display_name FROM users WHERE id='admin1'")).rows[0].display_name, 'Changed Admin');
    await db.pool.query("DELETE FROM users WHERE id='admin1'");
    assert.deepEqual(await seedAdmin(db.pool, config), { seeded: false });
    assert.equal(Number((await db.pool.query('SELECT count(*) FROM users')).rows[0].count), 0);
  } finally { await db.close(); }
});
test('admin-only seed refuses to elevate an existing email and leaves unrelated users untouched', { timeout: 60000 }, async () => {
  const db = await testDatabase();
  try {
    await migrate(db.pool);
    const config = readConfig({ NODE_ENV: 'test', DATABASE_URL: db.url, ALLOW_DEMO_SEED: 'true' });
    await db.pool.query("INSERT INTO users (id,email,display_name,initials,avatar) VALUES ('existing','admin@tracker.com','Employee','EM','EM')");
    const employee = (await db.pool.query("SELECT * FROM users WHERE id='existing'")).rows[0];
    await assert.rejects(seedAdmin(db.pool, config), /existing users were not modified/);
    assert.deepEqual((await db.pool.query("SELECT * FROM users WHERE id='existing'")).rows[0], employee);
    await db.pool.query("UPDATE users SET email='employee@example.com' WHERE id='existing'");
    const unrelated = (await db.pool.query("SELECT * FROM users WHERE id='existing'")).rows[0];
    assert.equal((await seedAdmin(db.pool, config)).seeded, true);
    assert.deepEqual((await db.pool.query("SELECT * FROM users WHERE id='existing'")).rows[0], unrelated);
    assert.equal(Number((await db.pool.query('SELECT count(*) FROM users')).rows[0].count), 2);
  } finally { await db.close(); }
});
test('switching from the old full demo to admin-only seed does not remove existing data', { timeout: 60000 }, async () => {
  const db = await testDatabase();
  try {
    await migrate(db.pool);
    const config = readConfig({ NODE_ENV: 'test', DATABASE_URL: db.url, ALLOW_DEMO_SEED: 'true' });
    await seedDemo(db.pool, config);
    const before = (await db.pool.query('SELECT * FROM users ORDER BY id')).rows;
    assert.deepEqual(await seedAdmin(db.pool, config), { seeded: false });
    assert.deepEqual((await db.pool.query('SELECT * FROM users ORDER BY id')).rows, before);
    assert.equal(Number((await db.pool.query('SELECT count(*) FROM issues')).rows[0].count), 12);
  } finally { await db.close(); }
});
