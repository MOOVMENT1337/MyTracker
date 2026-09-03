import { randomUUID } from 'node:crypto';
import { ApiError, initials, required, roleAliases, type PublicUser } from '../domain.js';
import { digest, hashPassword, token, verifyPassword } from '../security.js';
import { transaction, type Database, type Queryable } from '../db/pool.js';

export const userColumns = `id, email, display_name AS "displayName", initials, avatar,
  avatar_color AS "avatarColor", role, is_admin AS "isAdmin", provider`;
export async function getUser(db: Queryable, id: string): Promise<PublicUser> {
  return required((await db.query<PublicUser>(`SELECT ${userColumns} FROM users WHERE id=$1`, [id])).rows[0], 'User');
}
export async function insertUser(db: Queryable, input: {
  id?: string; email: string; displayName: string; passwordHash: string | null;
  provider?: string; isAdmin?: boolean;
}) {
  const userId = input.id || randomUUID();
  const letters = initials(input.displayName);
  await db.query(`INSERT INTO users (id,email,display_name,password_hash,initials,avatar,provider,is_admin,role)
    VALUES ($1,$2,$3,$4,$5,$5,$6,$7,$8)`, [userId, input.email.toLowerCase(), input.displayName,
    input.passwordHash, letters, input.provider || 'local', input.isAdmin || false, input.isAdmin ? 'Administrator' : 'Employee']);
  return getUser(db, userId);
}
export async function issueSession(db: Queryable, user: PublicUser, ttlHours: number) {
  const accessToken = token();
  const expiresAt = new Date(Date.now() + ttlHours * 3600000).toISOString();
  await db.query('INSERT INTO sessions (token_hash,user_id,expires_at) VALUES ($1,$2,$3)', [digest(accessToken), user.id, expiresAt]);
  return { user, accessToken, tokenType: 'Bearer', expiresAt };
}
export async function register(pool: Database, input: { email: string; displayName: string; password: string }, ttl: number) {
  const passwordHash = await hashPassword(input.password);
  return transaction(pool, async db => issueSession(db, await insertUser(db, { ...input, passwordHash }), ttl));
}
export async function login(pool: Database, identifier: string, password: string, ttl: number) {
  // The demo's special "admin" alias is retained; no ambiguous display-name login.
  const email = identifier.toLowerCase() === 'admin' ? 'admin@tracker.com' : identifier.toLowerCase();
  const row = (await pool.query('SELECT id,password_hash FROM users WHERE email=$1', [email])).rows[0];
  if (!await verifyPassword(password, row?.password_hash ?? null)) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  return issueSession(pool, await getUser(pool, row.id), ttl);
}
export async function authenticate(pool: Database, authorization?: string) {
  const match = /^Bearer ([A-Za-z0-9_-]{43})$/i.exec(authorization || '');
  if (!match) throw new ApiError(401, 'UNAUTHORIZED', 'Bearer authentication required');
  const tokenHash = digest(match[1]!);
  const session = (await pool.query('SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now()', [tokenHash])).rows[0];
  if (!session) throw new ApiError(401, 'UNAUTHORIZED', 'Session expired or revoked');
  return { user: await getUser(pool, session.user_id), tokenHash };
}
export function requireAdmin(user: PublicUser) {
  if (!user.isAdmin) throw new ApiError(403, 'FORBIDDEN', 'Administrator access required');
}
export async function updateUser(pool: Database, actor: PublicUser, id: string, changes: { displayName?: string; role?: string }) {
  requireAdmin(actor);
  if (changes.role && id === actor.id) throw new ApiError(403, 'SELF_ROLE_CHANGE', 'Cannot change your own role');
  return transaction(pool, async db => {
    required((await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [id])).rows[0], 'User');
    if (changes.displayName) {
      const letters = initials(changes.displayName);
      await db.query(`UPDATE users SET display_name=$2, avatar=CASE WHEN avatar=initials THEN $3 ELSE avatar END, initials=$3 WHERE id=$1`, [id, changes.displayName, letters]);
    }
    if (changes.role) await db.query('UPDATE users SET role=$2 WHERE id=$1', [id, roleAliases[changes.role] || changes.role]);
    // Job titles never grant administrator privileges, matching isAdmin in the demo.
    return getUser(db, id);
  });
}
