import { after, afterEach, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import type { Server } from 'node:http';
import { createApp } from '../src/app.js';
import { readConfig } from '../src/config.js';
import { migrate } from '../src/db/migrate.js';
import { seedDemo } from '../src/db/seed.js';
import { testDatabase } from './database.js';

let db: Awaited<ReturnType<typeof testDatabase>>;
let server: Server | undefined;
let base: string;
let adminToken: string;
const colors = ['#4F8EF7', '#E06C75', '#98C379', '#E5C07B', '#C678DD', '#56B6C2', '#D19A66', '#8B5CF6'];
async function request(path: string, options: { body?: unknown; token?: string; method?: string; cookie?: string } = {}) {
  const response = await fetch(base + path, {
    redirect: 'manual', method: options.method || (options.body === undefined ? 'GET' : 'POST'),
    headers: { ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}), ...(options.cookie ? { Cookie: options.cookie } : {}) },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text && response.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text };
}
const register = async (displayName: string, email: string, password = 'secure-password') => {
  const result = await request('/api/users', { token: adminToken, body: { displayName, email, password } });
  if (result.status === 201) result.body.data = { user: result.body.data };
  return result;
};
const login = (identifier: string, password: string) => request('/api/auth/login', { body: { identifier, password } });
const userCount = async () => Number((await db.pool.query('SELECT count(*) FROM users')).rows[0].count);

before(async () => {
  db = await testDatabase();
  await migrate(db.pool);
  await seedDemo(db.pool, readConfig({ NODE_ENV: 'test', DATABASE_URL: db.url, ALLOW_DEMO_SEED: 'true' }));
}, { timeout: 60000 });
beforeEach(async () => {
  const config = readConfig({ NODE_ENV: 'test', DATABASE_URL: db.url, LOG_LEVEL: 'silent',
    GOOGLE_CLIENT_ID: 'test', GOOGLE_CLIENT_SECRET: 'test', YANDEX_CLIENT_ID: 'test', YANDEX_CLIENT_SECRET: 'test', MAIL_CLIENT_ID: 'test', MAIL_CLIENT_SECRET: 'test' });
  const app = createApp(db.pool, config);
  server = await new Promise<Server>(resolve => { const instance = app.listen(0, '127.0.0.1', () => resolve(instance)); });
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
  const admin = await login('admin@tracker.com', 'admin123');
  assert.equal(admin.status, 200);
  adminToken = admin.body.data.accessToken;
});
afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  server = undefined;
});
after(async () => { if (db) await db.close(); });

test('display-name login is case-insensitive, supports Unicode and rejects wrong passwords', async () => {
  assert.equal((await login('  ALICE JOHNSON  ', 'pass123')).body.data.user.id, 'u1');
  assert.equal((await login('Admin', 'admin123')).body.data.user.id, 'admin1');
  assert.equal((await login('Alice Johnson', 'wrong')).status, 401);
  assert.equal((await login('missing user', 'pass123')).status, 401);
  const user = await register('Иван Петров', 'ivan@example.com');
  assert.equal(user.status, 201);
  assert.equal((await login('ИВАН ПЕТРОВ', 'secure-password')).body.data.user.id, user.body.data.user.id);
});
test('duplicate display names are allowed, but login must use a unique email', async () => {
  const first = await register('Same Name', 'first@example.com', 'first-password');
  const second = await register('same name', 'second@example.com', 'second-password');
  assert.equal(first.status, 201); assert.equal(second.status, 201);
  for (const password of ['first-password', 'second-password', 'wrong-password']) {
    const ambiguous = await login('SAME NAME', password);
    assert.equal(ambiguous.status, 400);
    assert.equal(ambiguous.body.error.code, 'LOGIN_EMAIL_REQUIRED');
    assert.ok(!JSON.stringify(ambiguous.body).includes('first@example.com'));
  }
  assert.equal((await login('FIRST@EXAMPLE.COM', 'first-password')).body.data.user.id, first.body.data.user.id);
  assert.equal((await login('second@example.com', 'second-password')).body.data.user.id, second.body.data.user.id);
  assert.equal((await register('Different Name', ' FIRST@EXAMPLE.COM ')).status, 409);
  assert.equal((await login('first@example.com', 'second-password')).status, 401);
});
test('email takes precedence over another account display name', async () => {
  const owner = await register('Owner', 'owner@example.com');
  assert.equal((await register('owner@example.com', 'namesake@example.com', 'namesake-password')).status, 201);
  assert.equal((await login('owner@example.com', 'secure-password')).body.data.user.id, owner.body.data.user.id);
  assert.equal((await login('owner@example.com', 'namesake-password')).status, 401);
});
test('renamed users login with their new names, including the demo administrator', async () => {
  const renamed = await request('/api/users/admin1', { method: 'PATCH', token: adminToken, body: { displayName: 'Renamed Admin' } });
  assert.equal(renamed.status, 200);
  try {
    assert.equal((await login('Renamed Admin', 'admin123')).body.data.user.id, 'admin1');
    assert.equal((await login('Admin', 'admin123')).status, 401);
    assert.equal((await login('admin@tracker.com', 'admin123')).body.data.user.id, 'admin1');
  } finally {
    assert.equal((await request('/api/users/admin1', { method: 'PATCH', token: adminToken, body: { displayName: 'Admin' } })).status, 200);
  }
});
test('registrations cycle through the demo palette and failed registration does not consume a color', async () => {
  const start = await userCount();
  for (let index = 0; index < 9; index++) {
    const created = await register(`Palette ${index}`, `palette-${index}@example.com`);
    assert.equal(created.status, 201);
    assert.equal(created.body.data.user.avatarColor, colors[(start + index) % colors.length]);
    assert.equal((await register('Duplicate', `palette-${index}@example.com`)).status, 409);
  }
});
test('concurrent registrations allocate consecutive palette positions and email remains unique', async () => {
  const start = await userCount();
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => register(`Concurrent ${index}`, `parallel-${index}@example.com`)));
  assert.ok(results.every(result => result.status === 201));
  assert.deepEqual(results.map(result => result.body.data.user.avatarColor).sort(), Array.from({ length: 8 }, (_, index) => colors[(start + index) % colors.length]).sort());
  const duplicate = await Promise.all([register('One', 'concurrent-duplicate@example.com'), register('Two', 'CONCURRENT-DUPLICATE@EXAMPLE.COM')]);
  assert.deepEqual(duplicate.map(result => result.status).sort(), [201, 409]);
});
test('single-letter and ten-letter queue keys work through API, numbering and lookup', async () => {
  for (const key of ['a', 'abcdefghij']) {
    const queue = await request('/api/queues', { token: adminToken, body: { name: 'Demo queue', key } });
    assert.equal(queue.status, 201, JSON.stringify(queue.body));
    const issue = await request('/api/issues', { token: adminToken, body: { queueId: queue.body.data.id, summary: 'Demo issue' } });
    assert.equal(issue.status, 201);
    assert.equal(issue.body.data.key, `${key.toUpperCase()}-1`);
    assert.equal((await request(`/api/issues/by-key/${key}-1`, { token: adminToken })).body.data.id, issue.body.data.id);
    assert.equal((await request(`/api/queues/by-key/${key}`, { token: adminToken })).body.data.id, queue.body.data.id);
    assert.equal((await request('/api/queues', { token: adminToken, body: { name: 'Duplicate', key: key.toUpperCase() } })).status, 409);
  }
  for (const key of ['A1', 'A_B', 'ABCDEFGHIJK']) {
    assert.equal((await request('/api/queues', { token: adminToken, body: { name: 'Invalid', key } })).status, 400);
  }
});
