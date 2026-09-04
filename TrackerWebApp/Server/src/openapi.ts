import { z } from 'zod';
import { commentSchema, filterSchema, issuePatchSchema, issueSchema, loginSchema, queueSchema, registerSchema, settingsSchema, userPatchSchema } from './domain.js';

type Schema = Record<string, unknown>;
const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const object = (properties: Record<string, unknown>, required = Object.keys(properties)): Schema => ({ type: 'object', properties, required });
const text = { type: 'string' };
const date = { type: 'string', format: 'date-time' };
const user = object({ id: text, email: { ...text, format: 'email' }, displayName: text, initials: text, avatar: text, avatarColor: text, role: text, isAdmin: { type: 'boolean' }, provider: text });
const queue = object({ id: text, key: text, name: text, color: text, counter: { type: 'integer' } });
const comment = object({ id: text, issueId: text, authorId: text, author: text, text, createdAt: date });
const issue = object({ id: text, key: text, queueId: text, summary: text, description: text, status: text, priority: text, type: text, assigneeId: { type: ['string', 'null'] }, reporterId: text, createdAt: date, updatedAt: date, statusChangedAt: date, version: { type: 'integer' }, comments: { type: 'array', items: ref('Comment') } });
const json = (schema: Schema) => ({ 'application/json': { schema } });
const paths: Record<string, Record<string, unknown>> = {};
function route(method: string, path: string, summary: string, options: { body?: string; result?: Schema; status?: number; public?: boolean; query?: Array<Record<string, unknown>>; raw?: boolean } = {}) {
  const status = options.status || 200;
  const parameters = [...path.matchAll(/\{(.*?)\}/g)].map(match => ({ name: match[1], in: 'path', required: true, schema: text }));
  const success = status === 204 || status === 302 ? { description: summary } : { description: summary, content: json(options.raw ? options.result || {} : object({ data: options.result || { type: 'object' } })) };
  (paths[path] ||= {})[method] = {
    summary, tags: [path.split('/')[2] || 'health'], security: options.public ? [] : [{ bearerAuth: [] }],
    parameters: [...parameters, ...(options.query || [])],
    ...(options.body ? { requestBody: { required: true, content: json(ref(options.body)) } } : {}),
    responses: { [status]: success, default: { description: 'Structured API error; see error.code', content: json(ref('ErrorResponse')) } },
  };
}
const pageQueries = [
  { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 50 } },
  { name: 'offset', in: 'query', schema: { type: 'integer', minimum: 0, default: 0 } },
];
const filterJson = z.toJSONSchema(filterSchema, { io: 'input' });
const filterQueries = Object.entries(filterJson.properties || {}).map(([name, schema]) => ({ name, in: 'query', schema, style: 'form', explode: true }));
const array = (schema: Schema) => ({ type: 'array', items: schema });
const page = (schema: Schema) => object({ data: array(schema), pagination: object({ total: { type: 'integer' }, limit: { type: 'integer' }, offset: { type: 'integer' } }) });
route('get', '/health/live', 'Process liveness', { public: true, raw: true });
route('get', '/health/ready', 'PostgreSQL readiness', { public: true, raw: true });
route('get', '/api/openapi.json', 'OpenAPI contract', { public: true, raw: true });
route('post', '/api/auth/register', 'Register an employee; 8–128 character password', { public: true, body: 'Register', result: ref('Auth'), status: 201 });
route('post', '/api/auth/login', 'Login by email or display name (case-insensitive); duplicate names require email (400 LOGIN_EMAIL_REQUIRED)', { public: true, body: 'Login', result: ref('Auth') });
route('get', '/api/auth/me', 'Current user', { result: ref('User') });
route('post', '/api/auth/logout', 'Revoke current session; send JSON {}', { status: 204 });
route('post', '/api/auth/logout-all', 'Revoke all own sessions; send JSON {}', { status: 204 });
route('get', '/api/auth/providers', 'Configured OAuth providers', { public: true, result: array(object({ id: text, enabled: { type: 'boolean' } })) });
route('get', '/api/auth/oauth/{provider}', 'Start Google/Yandex/Mail OAuth in a browser; sets HttpOnly state cookie', { public: true, status: 302 });
route('get', '/api/auth/oauth/{provider}/callback', 'OAuth callback; requires matching browser cookie, returns session JSON', { public: true, result: ref('Auth'), query: [{ name: 'code', in: 'query', required: true, schema: text }, { name: 'state', in: 'query', required: true, schema: text }] });
route('get', '/api/metadata', 'Statuses, priorities, types, roles and suggested transitions');
route('get', '/api/users', 'Users without passwords or password hashes', { raw: true, result: page(ref('User')), query: pageQueries });
route('get', '/api/users/{id}', 'User details', { result: ref('User') });
route('patch', '/api/users/{id}', 'Admin: update name or job title; title does not grant admin rights', { body: 'UserPatch', result: ref('User') });
route('get', '/api/settings', 'Own theme and language', { result: ref('Settings') });
route('patch', '/api/settings', 'Update own preferences', { body: 'Settings', result: ref('Settings') });
route('get', '/api/queues', 'All queues', { result: array(ref('Queue')) });
route('get', '/api/queues/{id}', 'Queue by ID', { result: ref('Queue') });
route('get', '/api/queues/by-key/{key}', 'Queue by key', { result: ref('Queue') });
route('post', '/api/queues', 'Create a queue', { body: 'QueueInput', result: ref('Queue'), status: 201 });
route('delete', '/api/queues/{id}', 'Admin: delete queue and cascade its issues/comments', { result: object({ queue: ref('Queue'), issueCount: { type: 'integer' } }) });
route('get', '/api/issues', 'Filter and paginate issues. Repeat status/priority/type query keys for multiple values', { raw: true, result: page(ref('Issue')), query: filterQueries });
route('get', '/api/issues/stats', 'Counts per status across the full filtered set', { query: filterQueries });
route('get', '/api/issues/{id}', 'Issue including comments', { result: ref('Issue') });
route('get', '/api/issues/by-key/{key}', 'Issue by human-readable key', { result: ref('Issue') });
route('post', '/api/issues', 'Create an issue; reporter inferred from session', { body: 'IssueInput', result: ref('Issue'), status: 201 });
route('patch', '/api/issues/{id}', 'Update issue; optional version detects conflicts. All demo statuses allowed', { body: 'IssuePatch', result: ref('Issue') });
route('delete', '/api/issues/{id}', 'Delete issue and comments', { status: 204 });
route('get', '/api/issues/{id}/comments', 'Comments ordered by creation time', { result: array(ref('Comment')) });
route('post', '/api/issues/{id}/comments', 'Add comment as current user', { body: 'CommentInput', result: ref('Comment'), status: 201 });
route('delete', '/api/issues/{id}/comments/{commentId}', 'Author: delete own comment', { status: 204 });
route('get', '/api/activity', 'Shared activity history; default last 20 entries', { raw: true, query: pageQueries });

export const openapi = {
  openapi: '3.1.0', info: { title: 'MyTracker API', version: '1.0.0', description: 'Single shared workspace matching the html+css+js demo. Bearer sessions; JSON requests. Admin rights are independent from job titles.' },
  servers: [{ url: 'http://localhost:3000' }], paths,
  components: {
    securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'opaque session token' } },
    schemas: {
      User: user, Queue: queue, Comment: comment, Issue: issue,
      Auth: object({ user: ref('User'), accessToken: text, tokenType: { const: 'Bearer' }, expiresAt: date }),
      ErrorResponse: object({ error: object({ code: text, message: text, requestId: text, details: { type: 'array', items: { type: 'object' } } }, ['code','message','requestId']) }),
      ...Object.fromEntries(Object.entries({ Register: registerSchema, Login: loginSchema, QueueInput: queueSchema, IssueInput: issueSchema, IssuePatch: issuePatchSchema, CommentInput: commentSchema, UserPatch: userPatchSchema, Settings: settingsSchema }).map(([name, schema]) => [name, z.toJSONSchema(schema, { io: 'input' })])),
    },
  },
};
