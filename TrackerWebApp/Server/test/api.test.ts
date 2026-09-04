import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { migrate } from '../src/db/migrate.js';
import { seedDemo } from '../src/db/seed.js';
import { digest } from '../src/security.js';
import { testDatabase } from './database.js';

let db: Awaited<ReturnType<typeof testDatabase>>;
let config: ReturnType<typeof readConfig>;
let server: Server;
let base: string;
let adminToken: string;
let aliceToken: string;
let bobToken: string;
let issueId: string;
let queueId: string;
let profileEmail = 'oauth@example.com';
let upstreamFailure = false;
let seenVerifier = false;
const oauthFetch: typeof fetch = async (url, options) => {
  if (upstreamFailure) return new Response('{}', { status: 500 });
  if (String(url).endsWith('/token')) {
    seenVerifier = new URLSearchParams(String(options?.body)).has('code_verifier');
    return Response.json({ access_token: 'test-provider-token' });
  }
  return Response.json({ sub: profileEmail, email: profileEmail, name: 'OAuth User', email_verified: true });
};
async function listen() {
  const app = createApp(db.pool, config, { oauthFetch });
  server = await new Promise<Server>(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
}
async function stopServer() { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
async function request(path: string, options: { method?: string; body?: unknown; token?: string; headers?: Record<string,string>; raw?: string } = {}) {
  const response = await fetch(base + path, {
    method: options.method || 'GET', redirect: 'manual',
    headers: { ...(options.body !== undefined || options.raw !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...options.headers },
    body: options.raw ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
}
async function login(identifier: string, password: string) {
  const result = await request('/api/auth/login', { method: 'POST', body: { identifier, password } });
  assert.equal(result.status, 200, JSON.stringify(result.body));
  return result.body.data.accessToken as string;
}
before(async () => {
  db = await testDatabase();
  config = readConfig({ NODE_ENV: 'test', DATABASE_URL: db.url, LOG_LEVEL: 'silent', ALLOW_DEMO_SEED: 'true', GOOGLE_CLIENT_ID: 'test-client', GOOGLE_CLIENT_SECRET: 'test-secret' });
  await migrate(db.pool);
  await seedDemo(db.pool, config);
  await listen();
  adminToken = await login('admin', 'admin123');
  aliceToken = await login('alice@example.com', 'pass123');
  bobToken = await login('bob@example.com', 'pass456');
}, { timeout: 60000 });
after(async () => { try { if (server) await stopServer(); } finally { if (db) await db.close(); } });

test('health checks and OpenAPI available without login', async () => {
  assert.equal((await request('/health/live')).status, 200);
  assert.equal((await request('/health/ready')).body.database, 'up');
  const spec = await request('/api/openapi.json');
  assert.equal(spec.body.openapi, '3.1.0');
  assert.ok(spec.body.paths['/api/issues/{id}'].patch);
  assert.equal(spec.headers.get('x-powered-by'), null);
  assert.equal(spec.headers.get('x-content-type-options'), 'nosniff');
});
test('migrations and seed are repeatable and production seed is blocked', async () => {
  await migrate(db.pool);
  assert.equal((await seedDemo(db.pool, config)).seeded, false);
  await assert.rejects(() => seedDemo(db.pool, { ...config, NODE_ENV: 'production' }), /non-production/);
  assert.equal(Number((await db.pool.query('SELECT count(*) FROM schema_migrations')).rows[0].count), 2);
});
test('all 6 demo users, 3 queues, 12 issues and 9 comments are preserved', async () => {
  const users = await request('/api/users', { token: aliceToken });
  assert.equal(users.body.pagination.total, 6);
  assert.equal((await request('/api/queues', { token: aliceToken })).body.data.length, 3);
  const issues = await request('/api/issues', { token: aliceToken });
  assert.equal(issues.body.pagination.total, 12);
  assert.equal(issues.body.data.flatMap((i: any) => i.comments).length, 9);
  assert.ok(!JSON.stringify(users.body).includes('password'));
  assert.ok((await db.pool.query('SELECT password_hash FROM users WHERE id=$1', ['admin1'])).rows[0].password_hash.startsWith('scrypt$'));
});
test('protected routes reject missing, fake and expired sessions', async () => {
  assert.equal((await request('/api/issues')).status, 401);
  assert.equal((await request('/api/issues', { token: 'forged' })).status, 401);
  const accessToken = await login('alice@example.com', 'pass123');
  await db.pool.query("UPDATE sessions SET expires_at=now()-interval '1 second' WHERE token_hash=$1", [digest(accessToken)]);
  assert.equal((await request('/api/auth/me', { token: accessToken })).status, 401);
});
test('registration normalizes email, rejects duplicate and privilege injection', async () => {
  const body = { email: ' NEW@Example.com ', displayName: 'New Employee', password: 'secure-pass123' };
  const result = await request('/api/auth/register', { method: 'POST', body });
  assert.equal(result.status, 201);
  assert.equal(result.body.data.user.email, 'new@example.com');
  assert.equal(result.body.data.user.isAdmin, false);
  assert.equal(result.body.data.user.avatarColor, '#D19A66');
  assert.equal((await request('/api/auth/me', { token: result.body.data.accessToken })).body.data.id, result.body.data.user.id);
  assert.equal((await request('/api/auth/register', { method: 'POST', body })).status, 409);
  assert.equal((await request('/api/auth/register', { method: 'POST', body: { ...body, isAdmin: true } })).status, 400);
  assert.equal((await request('/api/auth/login', { method: 'POST', body: { identifier: body.email, password: 'wrong' } })).status, 401);
});
test('server enforces admin edits, custom role aliases, and no role-based escalation', async () => {
  assert.equal((await request('/api/users/u2', { method: 'PATCH', token: aliceToken, body: { role: 'Administrator' } })).status, 403);
  const result = await request('/api/users/u2', { method: 'PATCH', token: adminToken, body: { displayName: 'Robert Smith', role: 'Тестировщик' } });
  assert.equal(result.body.data.displayName, 'Robert Smith');
  assert.equal(result.body.data.avatar, 'RS'); assert.equal(result.body.data.role, 'Tester');
  const titleOnly = await request('/api/users/u2', { method: 'PATCH', token: adminToken, body: { role: 'Administrator' } });
  assert.equal(titleOnly.body.data.isAdmin, false);
  assert.equal((await request('/api/users/admin1', { method: 'PATCH', token: adminToken, body: { role: 'Employee' } })).status, 403);
  assert.equal((await request('/api/users/u2', { method: 'PATCH', token: adminToken, body: { isAdmin: true } })).status, 400);
});
test('settings are isolated per user and survive new API instances', async () => {
  assert.equal((await request('/api/settings', { method: 'PATCH', token: aliceToken, body: { theme: 'dark', language: 'ru' } })).status, 200);
  assert.deepEqual((await request('/api/settings', { token: bobToken })).body.data, { theme: 'light', language: 'en' });
  await stopServer(); await listen();
  assert.deepEqual((await request('/api/settings', { token: aliceToken })).body.data, { theme: 'dark', language: 'ru' });
  assert.equal((await request('/api/auth/me', { token: aliceToken })).body.data.id, 'u1');
});
test('queue creation, normalized keys, lookup, duplicates and validation', async () => {
  const result = await request('/api/queues', { method: 'POST', token: aliceToken, body: { name: 'API Tests', key: 'test' } });
  assert.equal(result.status, 201); queueId = result.body.data.id;
  assert.equal(result.body.data.key, 'TEST');
  assert.equal((await request('/api/queues/by-key/test', { token: aliceToken })).body.data.id, queueId);
  assert.equal((await request('/api/queues', { method: 'POST', token: aliceToken, body: { name: 'Duplicate', key: 'TEST' } })).status, 409);
  assert.equal((await request('/api/queues', { method: 'POST', token: aliceToken, body: { name: '', key: 'invalid key' } })).status, 400);
});
test('issue creation generates key, reporter and timestamps on server', async () => {
  const result = await request('/api/issues', { method: 'POST', token: aliceToken, body: { queueId, summary: 'First API issue', assigneeId: 'u1', description: 'Literal 100%_text', priority: 'High' } });
  assert.equal(result.status, 201, JSON.stringify(result.body)); issueId = result.body.data.id;
  assert.equal(result.body.data.key, 'TEST-1'); assert.equal(result.body.data.reporterId, 'u1');
  assert.equal(result.body.data.version, 1); assert.ok(result.body.data.statusChangedAt);
  assert.equal((await request('/api/issues/by-key/test-1', { token: aliceToken })).body.data.id, issueId);
  assert.equal((await request('/api/issues', { method: 'POST', token: aliceToken, body: { queueId, summary: 'forged', reporterId: 'admin1' } })).status, 400);
});
test('invalid references roll back issue and counter together', async () => {
  const result = await request('/api/issues', { method: 'POST', token: aliceToken, body: { queueId, summary: 'Bad reference', assigneeId: 'absent-user' } });
  assert.equal(result.status, 400);
  assert.equal((await request(`/api/queues/${queueId}`, { token: aliceToken })).body.data.counter, 1);
  assert.equal((await request('/api/issues', { method: 'POST', token: aliceToken, body: { queueId: 'absent-queue', summary: 'Bad queue' } })).status, 404);
});
test('concurrent issue creation allocates 16 distinct sequential keys', async () => {
  const results = await Promise.all(Array.from({ length: 16 }, (_, index) => request('/api/issues', { method: 'POST', token: bobToken, body: { queueId, summary: `Concurrent ${index}` } })));
  assert.ok(results.every(r => r.status === 201), JSON.stringify(results.map(r => r.body)));
  assert.equal(new Set(results.map(r => r.body.data.key)).size, 16);
  const numbers = results.map(r => Number(r.body.data.key.split('-')[1])).sort((a,b) => a-b);
  assert.deepEqual(numbers, Array.from({ length: 16 }, (_, i) => i+2));
});
test('partial issue edits preserve omitted fields and reset timer only on status change', async () => {
  const before = (await request(`/api/issues/${issueId}`, { token: aliceToken })).body.data;
  const edit = await request(`/api/issues/${issueId}`, { method: 'PATCH', token: aliceToken, body: { summary: 'Renamed API issue', version: before.version } });
  assert.equal(edit.status, 200); assert.equal(edit.body.data.priority, 'High');
  assert.equal(edit.body.data.description, before.description); assert.equal(edit.body.data.statusChangedAt, before.statusChangedAt);
  const status = await request(`/api/issues/${issueId}`, { method: 'PATCH', token: aliceToken, body: { status: 'Done' } });
  assert.equal(status.body.data.status, 'Done'); assert.notEqual(status.body.data.statusChangedAt, before.statusChangedAt);
  assert.equal((await request(`/api/issues/${issueId}`, { method: 'PATCH', token: aliceToken, body: { summary: 'stale', version: 1 } })).status, 409);
  assert.equal((await request(`/api/issues/${issueId}`, { method: 'PATCH', token: aliceToken, body: { status: 'unknown' } })).status, 400);
  assert.equal((await request(`/api/issues/${issueId}`, { method: 'PATCH', token: aliceToken, body: {} })).status, 400);
});
test('two writes with same version cannot silently overwrite each other', async () => {
  const issue = (await request(`/api/issues/${issueId}`, { token: aliceToken })).body.data;
  const results = await Promise.all(['A','B'].map(summary => request(`/api/issues/${issueId}`, { method: 'PATCH', token: aliceToken, body: { summary, version: issue.version } })));
  assert.deepEqual(results.map(r => r.status).sort(), [200,409]);
});
test('comments use authenticated author and enforce ownership even for admin', async () => {
  const result = await request(`/api/issues/${issueId}/comments`, { method: 'POST', token: aliceToken, body: { text: 'API comment' } });
  assert.equal(result.status, 201); assert.equal(result.body.data.authorId, 'u1');
  const path = `/api/issues/${issueId}/comments/${result.body.data.id}`;
  assert.equal((await request(path, { method: 'DELETE', token: bobToken })).status, 403);
  assert.equal((await request(path, { method: 'DELETE', token: adminToken })).status, 403);
  assert.equal((await request(path, { method: 'DELETE', token: aliceToken })).status, 204);
  assert.equal((await request(path, { method: 'DELETE', token: aliceToken })).status, 404);
  assert.equal((await request(`/api/issues/${issueId}/comments`, { method: 'POST', token: aliceToken, body: { text: ' ' } })).status, 400);
});
test('filters, literal search, multi-select, myTasks and full-set statistics', async () => {
  const mine = await request('/api/issues?myTasks=true&status=Open&status=Done&priority=High&limit=1', { token: aliceToken });
  assert.equal(mine.status, 200); assert.equal(mine.body.data.length, 1); assert.ok(mine.body.pagination.total >= 2);
  const literal = await request('/api/issues?search=100%25_text', { token: aliceToken });
  assert.equal(literal.body.pagination.total, 1);
  assert.equal((await request('/api/issues?search=%27%20OR%201%3D1--', { token: aliceToken })).body.pagination.total, 0);
  const stats = await request(`/api/issues/stats?queueId=${queueId}&limit=1`, { token: aliceToken });
  assert.equal(stats.body.data.total, 17); assert.equal(stats.body.data.byStatus.Done, 1);
  assert.equal((await request('/api/issues?limit=101', { token: aliceToken })).status, 400);
  assert.equal((await request('/api/issues?offset=999999', { token: aliceToken })).body.data.length, 0);
});
test('shared activity includes creates, comments and status history', async () => {
  const result = await request('/api/activity?limit=100', { token: aliceToken });
  assert.ok(result.body.data.some((entry: any) => entry.msg.includes('Open → Done')));
  assert.ok(result.body.data.some((entry: any) => entry.msg.includes('Comment added')));
  const metadata = (await request('/api/metadata', { token: aliceToken })).body.data;
  assert.deepEqual(metadata.statuses, ['Open','In Progress','Need Info','Done','Closed']);
  assert.deepEqual(metadata.transitions.Closed, ['Open']);
});
test('deleting issues cascades comments and does not reuse issue keys', async () => {
  await request(`/api/issues/${issueId}/comments`, { method: 'POST', token: aliceToken, body: { text: 'Cascade me' } });
  assert.equal((await request(`/api/issues/${issueId}`, { method: 'DELETE', token: bobToken })).status, 204);
  assert.equal(Number((await db.pool.query('SELECT count(*) FROM comments WHERE issue_id=$1', [issueId])).rows[0].count), 0);
  const newIssue = await request('/api/issues', { method: 'POST', token: aliceToken, body: { queueId, summary: 'After deletion' } });
  assert.equal(newIssue.body.data.key, 'TEST-18');
});
test('only admin can delete a queue; all children are removed atomically', async () => {
  assert.equal((await request(`/api/queues/${queueId}`, { method: 'DELETE', token: bobToken })).status, 403);
  const result = await request(`/api/queues/${queueId}`, { method: 'DELETE', token: adminToken });
  assert.equal(result.status, 200); assert.equal(result.body.data.issueCount, 17);
  assert.equal(Number((await db.pool.query('SELECT count(*) FROM issues WHERE queue_id=$1', [queueId])).rows[0].count), 0);
  assert.equal((await request(`/api/queues/${queueId}`, { token: aliceToken })).status, 404);
});
test('CORS, malformed JSON, mass assignment, media type and body limits are enforced', async () => {
  assert.equal((await request('/api/queues', { token: aliceToken, headers: { Origin: 'https://untrusted.example' } })).status, 403);
  assert.equal((await request('/api/issues', { method: 'POST', token: aliceToken, raw: '{' })).status, 400);
  assert.equal((await request('/api/issues', { method: 'POST', token: aliceToken, raw: 'x'.repeat(140000) })).status, 413);
  assert.equal((await request('/api/issues', { method: 'POST', token: aliceToken, raw: '{}', headers: { 'Content-Type': 'text/plain' } })).status, 415);
  const missing = await request('/api/not-found', { token: aliceToken });
  assert.equal(missing.status, 404); assert.ok(missing.body.error.requestId); assert.ok(!JSON.stringify(missing.body).includes('stack'));
});
test('OAuth is disabled without credentials and rejects forged state', async () => {
  assert.equal((await request('/api/auth/oauth/yandex')).status, 503);
  assert.equal((await request('/api/auth/oauth/google/callback?code=fake&state=' + 'a'.repeat(43))).status, 400);
});
async function oauthStart() {
  const start = await request('/api/auth/oauth/google');
  assert.equal(start.status, 302);
  const url = new URL(start.headers.get('location')!);
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  const cookie = start.headers.get('set-cookie')!.split(';')[0]!;
  return { path: `/api/auth/oauth/google/callback?code=test-code&state=${url.searchParams.get('state')}`, headers: { Cookie: cookie } };
}
test('OAuth exchanges code server-side, validates cookie, and prevents replay (mock provider)', async () => {
  const flow = await oauthStart();
  assert.equal((await request(flow.path)).status, 400);
  const result = await request(flow.path, { headers: flow.headers });
  assert.equal(result.status, 200, JSON.stringify(result.body)); assert.equal(result.body.data.user.provider, 'google');
  assert.equal(result.body.data.user.isAdmin, false); assert.ok(seenVerifier);
  assert.equal(result.body.data.user.avatarColor, '#DB4437');
  assert.equal((await request(flow.path, { headers: flow.headers })).status, 400);
  const repeat = await oauthStart();
  assert.equal((await request(repeat.path, { headers: repeat.headers })).body.data.user.id, result.body.data.user.id);
});
test('OAuth does not merge identities by email or leak upstream failures (mock provider)', async () => {
  profileEmail = 'alice@example.com';
  const collision = await oauthStart();
  assert.equal((await request(collision.path, { headers: collision.headers })).status, 409);
  upstreamFailure = true;
  const failed = await oauthStart();
  assert.equal((await request(failed.path, { headers: failed.headers })).status, 502);
  upstreamFailure = false;
});
test('logout and logout-all really revoke stored sessions', async () => {
  const one = await login('new@example.com', 'secure-pass123');
  const two = await login('new@example.com', 'secure-pass123');
  assert.equal((await request('/api/auth/logout', { method: 'POST', token: one, body: {} })).status, 204);
  assert.equal((await request('/api/auth/me', { token: one })).status, 401);
  assert.equal((await request('/api/auth/me', { token: two })).status, 200);
  assert.equal((await request('/api/auth/logout-all', { method: 'POST', token: two, body: {} })).status, 204);
  assert.equal((await request('/api/auth/me', { token: two })).status, 401);
});
test('authentication flood is rate limited', async () => {
  // New limiter instance isolates this check from all earlier auth scenarios.
  await stopServer(); await listen();
  let result;
  for (let i=0; i<31; i++) result = await request('/api/auth/login', { method: 'POST', body: {} });
  assert.equal(result!.status, 429);
  assert.ok(result!.headers.get('ratelimit'));
});
