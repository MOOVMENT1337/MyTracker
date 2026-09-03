import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, digest, token } from '../src/security.js';
import { filterSchema, initials, issuePatchSchema, queueSchema, registerSchema } from '../src/domain.js';
import { parseProfile } from '../src/services/oauth.js';

test('scrypt passwords are salted; wrong and absent passwords fail', async () => {
  const hash = await hashPassword('strong-password');
  assert.notEqual(hash, await hashPassword('strong-password'));
  assert.equal(await verifyPassword('strong-password', hash), true);
  assert.equal(await verifyPassword('wrong', hash), false);
  assert.equal(await verifyPassword('anything', null), false);
});
test('opaque tokens have 256 bits and only digests are stored', () => {
  const value = token(); assert.equal(value.length, 43); assert.equal(digest(value).length, 64); assert.notEqual(token(), value);
});
test('PATCH never applies create defaults to omitted fields', () => {
  assert.deepEqual(issuePatchSchema.parse({ summary: 'New' }), { summary: 'New' });
  assert.deepEqual(issuePatchSchema.parse({ assigneeId: null }), { assigneeId: null });
  assert.equal(issuePatchSchema.safeParse({}).success, false);
  assert.equal(issuePatchSchema.safeParse({ version: 1 }).success, false);
});
test('registration rejects privilege injection and normalizes email', () => {
  assert.equal(registerSchema.parse({ displayName: ' Test ', email: ' User@Example.com ', password: '12345678' }).email, 'user@example.com');
  assert.equal(registerSchema.safeParse({ displayName: 'T', email: 'a@b.com', password: '12345678', isAdmin: true }).success, false);
});
test('query validation handles repeated filters and boolean strings', () => {
  assert.equal(filterSchema.parse({ myTasks: 'false' }).myTasks, 'false');
  assert.deepEqual(filterSchema.parse({ status: ['Open','Done'] }).status, ['Open','Done']);
  assert.equal(filterSchema.safeParse({ limit: '-1' }).success, false);
  assert.equal(filterSchema.safeParse({ myTasks: 'garbage' }).success, false);
});
test('queue keys and initials match the demo', () => {
  assert.equal(queueSchema.parse({ name: 'Dev', key: ' dev ' }).key, 'DEV');
  assert.equal(initials('Alice Johnson'), 'AJ'); assert.equal(initials('Admin'), 'AD');
});
test('OAuth profiles require identity and Google verified email', () => {
  assert.throws(() => parseProfile('google', { sub: '1', email: 'a@example.com', name: 'A', email_verified: false }));
  assert.equal(parseProfile('yandex', { id: '2', default_email: 'a@yandex.ru', display_name: 'A' }).subject, '2');
  assert.equal(parseProfile('mail', { id: '3', email: 'a@mail.ru', first_name: 'A', last_name: 'B' }).displayName, 'A B');
});
