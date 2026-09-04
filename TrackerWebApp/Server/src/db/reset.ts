import { transaction, type Database } from './pool.js';

// Explicit maintenance command only. Never invoked by startup, seed or migrations.
export async function resetWorkspace(pool: Database, keepAdminId?: string) {
  return transaction(pool, async db => {
    await db.query('LOCK TABLE users, queues, issues, comments, activity_log, sessions, oauth_identities, oauth_states IN ACCESS EXCLUSIVE MODE');
    const admins = (await db.query('SELECT id,email,password_hash FROM users WHERE is_admin=true ORDER BY created_at,id')).rows;
    const admin = keepAdminId ? admins.find(user => user.id === keepAdminId) : admins.length === 1 ? admins[0] : undefined;
    if (!admin) throw new Error('Expected one administrator. If there are multiple admins, set KEEP_ADMIN_ID to the administrator to preserve. Nothing was deleted.');
    if (!admin.password_hash) throw new Error('The retained administrator must have a password login. Nothing was deleted.');

    const counts = (await db.query(`SELECT
      (SELECT count(*)::int FROM queues) AS queues,
      (SELECT count(*)::int FROM issues) AS issues,
      (SELECT count(*)::int FROM comments) AS comments,
      (SELECT count(*)::int FROM users WHERE id<>$1) AS users`, [admin.id])).rows[0];
    await db.query('DELETE FROM comments');
    await db.query('DELETE FROM issues');
    await db.query('DELETE FROM queues');
    await db.query('DELETE FROM activity_log');
    await db.query('DELETE FROM oauth_states');
    await db.query('DELETE FROM oauth_identities');
    await db.query('DELETE FROM users WHERE id<>$1', [admin.id]);
    await db.query("UPDATE users SET theme='dark',language='ru' WHERE id=$1", [admin.id]);
    // Retain seed_history: a later full-demo seed must not recreate removed data.
    return { keptAdminId: admin.id, deleted: counts, remaining: { users: 1, queues: 0, issues: 0, comments: 0 } };
  });
}
