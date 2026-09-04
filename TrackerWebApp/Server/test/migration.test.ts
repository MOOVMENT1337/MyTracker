import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { migrate } from '../src/db/migrate.js';
import { testDatabase } from './database.js';
import { createIssue } from '../src/services/tracker.js';
import { issueSchema } from '../src/domain.js';

test('upgrading an existing database preserves legacy queues and allows demo keys', { timeout: 60000 }, async () => {
  const db = await testDatabase();
  try {
    const sql = await readFile(new URL('../migrations/001_initial.sql', import.meta.url), 'utf8');
    await db.pool.query(sql);
    await db.pool.query('CREATE TABLE schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    await db.pool.query('INSERT INTO schema_migrations (name,checksum) VALUES ($1,$2)', ['001_initial.sql', createHash('sha256').update(sql).digest('hex')]);
    await db.pool.query("INSERT INTO queues (id,key,name,counter) VALUES ('legacy','LEGACY_1','Existing queue',7)");
    await db.pool.query("INSERT INTO users (id,email,display_name,initials,avatar,avatar_color) VALUES ('owner','owner@example.com','Owner','OW','OW','#123456')");
    await db.pool.query("INSERT INTO issues (id,key,queue_id,summary,reporter_id) VALUES ('old-issue','LEGACY_1-7','legacy','Existing issue','owner')");
    const oldQueue = (await db.pool.query("SELECT * FROM queues WHERE id='legacy'")).rows[0];
    const oldIssue = (await db.pool.query("SELECT * FROM issues WHERE id='old-issue'")).rows[0];
    await migrate(db.pool);
    await migrate(db.pool);
    assert.deepEqual((await db.pool.query("SELECT * FROM queues WHERE id='legacy'")).rows[0], oldQueue);
    assert.deepEqual((await db.pool.query("SELECT * FROM issues WHERE id='old-issue'")).rows[0], oldIssue);
    assert.equal((await db.pool.query("SELECT avatar_color FROM users WHERE id='owner'")).rows[0].avatar_color, '#123456');
    const created = await createIssue(db.pool, 'owner', issueSchema.parse({ queueId: 'legacy', summary: 'New issue in legacy queue' }));
    assert.equal(created.key, 'LEGACY_1-8');
    await db.pool.query("UPDATE queues SET key=key WHERE id='legacy'");
    await assert.rejects(db.pool.query("UPDATE queues SET key='ANOTHER_1' WHERE id='legacy'"), { code: '23514' });
    await db.pool.query("INSERT INTO queues (id,key,name) VALUES ('single','A','Single letter')");
    for (const key of ['NEW_1', 'NEW1', 'ABCDEFGHIJK']) {
      await assert.rejects(db.pool.query('INSERT INTO queues (id,key,name) VALUES ($1,$2,$3)', [key, key, 'Invalid']), { code: '23514' });
    }
  } finally { await db.close(); }
});
