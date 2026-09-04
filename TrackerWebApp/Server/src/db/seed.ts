import { readFile } from 'node:fs/promises';
import { hashPassword } from '../security.js';
import { transaction, type Database } from './pool.js';
import type { Config } from '../config.js';

type Demo = {
  users: Array<{ id: string; email: string; password: string; displayName: string; initials: string; avatar: string; avatarColor: string; role: string; isAdmin: boolean; provider: string }>;
  queues: Array<{ id: string; key: string; name: string; color: string; counter: number }>;
  issues: Array<{ id: string; key: string; queueId: string; summary: string; description: string; status: string; priority: string; type: string; assigneeId: string | null; reporterId: string; createdAt: string; updatedAt: string; statusChangedAt: string; comments: Array<{ id: string; authorId: string; text: string; createdAt: string }> }>;
};
// The normal development seed imports only the requested administrator.
// Keep the full snapshot below for explicit, isolated API test fixtures.
export async function seedAdmin(pool: Database, config: Config) {
  if (config.NODE_ENV === 'production' || config.ALLOW_DEMO_SEED !== 'true') throw new Error('Demo seed requires ALLOW_DEMO_SEED=true and a non-production environment');
  const data: Demo = JSON.parse(await readFile(new URL('../../seeds/demo.json', import.meta.url), 'utf8'));
  const admin = data.users.find(user => user.email === 'admin@tracker.com' && user.isAdmin);
  if (!admin) throw new Error('Demo administrator not found');
  const passwordHash = await hashPassword(admin.password);
  return transaction(pool, async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext(current_schema() || ':tracker-seed'))");
    await db.query("SELECT pg_advisory_xact_lock(hashtext(current_schema() || ':tracker-users'))");
    await db.query('CREATE TABLE IF NOT EXISTS seed_history (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    if ((await db.query("SELECT 1 FROM seed_history WHERE name='demo-admin-v1'")).rowCount) return { seeded: false };
    const existing = (await db.query('SELECT id,email,is_admin FROM users WHERE id=$1 OR email=$2 FOR UPDATE', [admin.id, admin.email])).rows;
    if (existing.length) {
      if (existing.length === 1 && existing[0].id === admin.id && existing[0].email === admin.email && existing[0].is_admin) {
        await db.query("INSERT INTO seed_history (name) VALUES ('demo-admin-v1')");
        return { seeded: false };
      }
      throw new Error('Demo administrator ID/email already belongs to another account; existing users were not modified');
    }
    await db.query(`INSERT INTO users (id,email,password_hash,display_name,initials,avatar,avatar_color,role,is_admin,provider)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [admin.id,admin.email,passwordHash,admin.displayName,admin.initials,admin.avatar,admin.avatarColor,admin.role,true,admin.provider]);
    await db.query("INSERT INTO seed_history (name) VALUES ('demo-admin-v1')");
    return { seeded: true, users: 1, queues: 0, issues: 0 };
  });
}
export async function seedDemo(pool: Database, config: Config) {
  if (config.NODE_ENV === 'production' || config.ALLOW_DEMO_SEED !== 'true') throw new Error('Demo seed requires ALLOW_DEMO_SEED=true and a non-production environment');
  const data: Demo = JSON.parse(await readFile(new URL('../../seeds/demo.json', import.meta.url), 'utf8'));
  const hashes = new Map<string, string>();
  for (const user of data.users) hashes.set(user.id, await hashPassword(user.password));
  return transaction(pool, async db => {
    await db.query("SELECT pg_advisory_xact_lock(hashtext(current_schema() || ':tracker-seed'))");
    await db.query("SELECT pg_advisory_xact_lock(hashtext(current_schema() || ':tracker-users'))");
    await db.query('CREATE TABLE IF NOT EXISTS seed_history (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    if ((await db.query("SELECT 1 FROM seed_history WHERE name='demo-v1'")).rowCount) return { seeded: false };
    // Refuse to merge defaults into a populated database or overwrite real users.
    const count = (await db.query('SELECT (SELECT count(*) FROM users)+(SELECT count(*) FROM queues)+(SELECT count(*) FROM issues) AS total')).rows[0].total;
    if (Number(count) !== 0) throw new Error('Demo seed requires an empty database');
    for (const u of data.users) {
      await db.query(`INSERT INTO users (id,email,password_hash,display_name,initials,avatar,avatar_color,role,is_admin,provider)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [u.id,u.email,hashes.get(u.id),u.displayName,u.initials,u.avatar,u.avatarColor,u.role,u.isAdmin,u.provider]);
    }
    for (const q of data.queues) await db.query('INSERT INTO queues (id,key,name,color,counter) VALUES ($1,$2,$3,$4,$5)', [q.id,q.key,q.name,q.color,q.counter]);
    for (const i of data.issues) {
      await db.query(`INSERT INTO issues (id,key,queue_id,summary,description,status,priority,type,assignee_id,reporter_id,created_at,updated_at,status_changed_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [i.id,i.key,i.queueId,i.summary,i.description,i.status,i.priority,i.type,i.assigneeId,i.reporterId,i.createdAt,i.updatedAt,i.statusChangedAt]);
      for (const c of i.comments) await db.query('INSERT INTO comments (id,issue_id,author_id,text,created_at) VALUES ($1,$2,$3,$4,$5)', [c.id,i.id,c.authorId,c.text,c.createdAt]);
    }
    await db.query("INSERT INTO seed_history (name) VALUES ('demo-v1')");
    return { seeded: true, users: data.users.length, queues: data.queues.length, issues: data.issues.length };
  });
}
