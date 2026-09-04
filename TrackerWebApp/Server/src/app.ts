import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { pinoHttp } from 'pino-http';
import { pino } from 'pino';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';
import type { Config } from './config.js';
import type { Database } from './db/pool.js';
import { ApiError, commentSchema, filterSchema, idSchema, issuePatchSchema, issueSchema, issueTypes, loginSchema, paginationSchema, priorities, queueSchema, registerSchema, required, roleAliases, settingsSchema, statuses, transitions, userPatchSchema, type PublicUser } from './domain.js';
import * as users from './services/users.js';
import * as tracker from './services/tracker.js';
import { openapi } from './openapi.js';

export function createApp(pool: Database, config: Config) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', config.TRUST_PROXY_HOPS);
  app.set('query parser', 'simple');
  app.use(pinoHttp({
    logger: pino({ level: config.LOG_LEVEL }),
    genReqId: (_req, res) => { const id = randomUUID(); res.setHeader('X-Request-Id', id); return id; },
    // No headers, bodies, query strings, OAuth codes, or tokens in request logs.
    serializers: { req: req => ({ id: req.id, method: req.method, path: String(req.url).split('?')[0] }), res: res => ({ statusCode: res.statusCode }) },
  }));
  app.use(helmet());
  app.use(cors({ origin: (origin, callback) => {
    if (!origin || [new URL(config.PUBLIC_URL).origin, new URL(config.FRONTEND_URL).origin, ...config.corsOrigins].includes(origin)) callback(null, true);
    else callback(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'Origin is not allowed'));
  }, credentials: true, allowedHeaders: ['Content-Type', 'Authorization', 'X-Tracker-Browser'], exposedHeaders: ['X-Request-Id'] }));
  app.use((_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1 FROM schema_migrations LIMIT 1');
      res.json({ status: 'ok', database: 'up' });
    } catch { res.status(503).json({ status: 'unavailable', database: 'down' }); }
  });
  const limiter = (limit: number, windowMs: number) => rateLimit({
    windowMs, limit, standardHeaders: 'draft-8', legacyHeaders: false,
    handler: (_req, _res, next) => next(new ApiError(429, 'RATE_LIMITED', 'Too many requests; try again later')),
  });
  app.use('/api', limiter(600, 60000));
  app.use(express.json({ limit: '128kb', strict: true }));
  app.use((req, _res, next) => {
    if (['POST', 'PATCH', 'PUT'].includes(req.method) && !req.is('application/json')) {
      next(new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use Content-Type: application/json'));
    } else next();
  });
  app.get('/api/openapi.json', (_req, res) => res.json(openapi));
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/oauth'], limiter(30, 15 * 60000));
  const sessionOptions = { httpOnly: true, secure: config.NODE_ENV === 'production', sameSite: 'lax' as const, path: '/api' };
  const cookie = (req: Request, name: string) => req.headers.cookie?.split(';').map(v => v.trim()).find(v => v.startsWith(`${name}=`))?.slice(name.length + 1);
  const browserSession = (res: Response, session: Awaited<ReturnType<typeof users.login>>) => {
    res.cookie('tracker_session', session.accessToken, { ...sessionOptions, expires: new Date(session.expiresAt) });
    return { user: session.user, expiresAt: session.expiresAt };
  };
  app.post('/api/auth/register', () => { throw new ApiError(403, 'REGISTRATION_DISABLED', 'Accounts are created by an administrator'); });
  app.post('/api/auth/login', async (req, res) => {
    const input = loginSchema.parse(req.body);
    const session = await users.login(pool, input.identifier, input.password, config.SESSION_TTL_HOURS);
    res.json({ data: req.get('X-Tracker-Browser') === '1' ? browserSession(res, session) : session });
  });
  app.get('/api/auth/providers', (_req, res) => res.json({ data: [] }));
  app.use('/api/auth/oauth', () => { throw new ApiError(403, 'EXTERNAL_AUTH_DISABLED', 'Use your login and password'); });
  app.use('/api', async (req, res, next) => {
    const sessionCookie = cookie(req, 'tracker_session');
    if (!req.headers.authorization && sessionCookie && !['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('X-Tracker-Browser') !== '1') {
      throw new ApiError(403, 'CSRF_REJECTED', 'Browser mutation requires X-Tracker-Browser header');
    }
    const auth = await users.authenticate(pool, req.headers.authorization || (sessionCookie ? `Bearer ${sessionCookie}` : undefined));
    res.locals.user = auth.user; res.locals.tokenHash = auth.tokenHash;
    next();
  });
  const actor = (res: Response): PublicUser => res.locals.user;
  const param = (req: Request, name = 'id') => idSchema.parse(req.params[name]);
  app.get('/api/auth/me', (_req, res) => res.json({ data: actor(res) }));
  app.post('/api/auth/logout', async (_req, res) => { await pool.query('DELETE FROM sessions WHERE token_hash=$1', [res.locals.tokenHash]); res.clearCookie('tracker_session', sessionOptions); res.sendStatus(204); });
  app.post('/api/auth/logout-all', async (_req, res) => { await pool.query('DELETE FROM sessions WHERE user_id=$1', [actor(res).id]); res.clearCookie('tracker_session', sessionOptions); res.sendStatus(204); });
  app.get('/api/metadata', (_req, res) => res.json({ data: { statuses, priorities, types: issueTypes, transitions, roles: [...new Set(Object.values(roleAliases))] } }));
  app.get('/api/users', async (req, res) => {
    const { limit, offset } = paginationSchema.strict().parse(req.query);
    const data = (await pool.query(`SELECT ${users.userColumns} FROM users ORDER BY created_at,id LIMIT $1 OFFSET $2`, [limit, offset])).rows;
    const total = Number((await pool.query('SELECT count(*) FROM users')).rows[0].count);
    res.json({ data, pagination: { total, limit, offset } });
  });
  app.get('/api/users/:id', async (req, res) => res.json({ data: await users.getUser(pool, param(req)) }));
  app.post('/api/users', async (req, res) => {
    users.requireAdmin(actor(res));
    res.status(201).json({ data: await users.createUser(pool, actor(res), registerSchema.parse(req.body)) });
  });
  app.patch('/api/users/:id', async (req, res) => res.json({ data: await users.updateUser(pool, actor(res), param(req), userPatchSchema.parse(req.body)) }));
  app.get('/api/settings', async (_req, res) => res.json({ data: (await pool.query('SELECT theme,language FROM users WHERE id=$1', [actor(res).id])).rows[0] }));
  app.patch('/api/settings', async (req, res) => {
    const input = settingsSchema.parse(req.body);
    const data = (await pool.query('UPDATE users SET theme=COALESCE($2,theme),language=COALESCE($3,language) WHERE id=$1 RETURNING theme,language', [actor(res).id, input.theme, input.language])).rows[0];
    res.json({ data });
  });
  app.get('/api/queues', async (_req, res) => res.json({ data: (await pool.query('SELECT * FROM queues ORDER BY key')).rows }));
  app.get('/api/queues/by-key/:key', async (req, res) => res.json({ data: required((await pool.query('SELECT * FROM queues WHERE key=$1', [idSchema.parse(req.params.key).toUpperCase()])).rows[0], 'Queue') }));
  app.get('/api/queues/:id', async (req, res) => res.json({ data: required((await pool.query('SELECT * FROM queues WHERE id=$1', [param(req)])).rows[0], 'Queue') }));
  app.post('/api/queues', async (req, res) => res.status(201).json({ data: await tracker.createQueue(pool, actor(res).id, queueSchema.parse(req.body)) }));
  app.delete('/api/queues/:id', async (req, res) => res.json({ data: await tracker.deleteQueue(pool, actor(res), param(req)) }));
  app.get('/api/issues', async (req, res) => res.json(await tracker.listIssues(pool, filterSchema.parse(req.query), actor(res).id)));
  app.get('/api/issues/stats', async (req, res) => res.json({ data: await tracker.stats(pool, filterSchema.parse(req.query), actor(res).id) }));
  app.get('/api/issues/by-key/:key', async (req, res) => {
    const row = required((await pool.query('SELECT id FROM issues WHERE key=$1', [idSchema.parse(req.params.key).toUpperCase()])).rows[0], 'Issue');
    res.json({ data: await tracker.getIssue(pool, row.id) });
  });
  app.get('/api/issues/:id', async (req, res) => res.json({ data: await tracker.getIssue(pool, param(req)) }));
  app.post('/api/issues', async (req, res) => res.status(201).json({ data: await tracker.createIssue(pool, actor(res).id, issueSchema.parse(req.body)) }));
  app.patch('/api/issues/:id', async (req, res) => res.json({ data: await tracker.updateIssue(pool, actor(res).id, param(req), issuePatchSchema.parse(req.body)) }));
  app.delete('/api/issues/:id', async (req, res) => { await tracker.deleteIssue(pool, actor(res).id, param(req)); res.sendStatus(204); });
  app.get('/api/issues/:id/comments', async (req, res) => res.json({ data: (await tracker.getIssue(pool, param(req))).comments }));
  app.post('/api/issues/:id/comments', async (req, res) => res.status(201).json({ data: await tracker.addComment(pool, actor(res).id, param(req), commentSchema.parse(req.body).text) }));
  app.delete('/api/issues/:id/comments/:commentId', async (req, res) => { await tracker.deleteComment(pool, actor(res), param(req), param(req, 'commentId')); res.sendStatus(204); });
  app.get('/api/activity', async (req, res) => {
    const { limit, offset } = paginationSchema.extend({ limit: z.coerce.number().int().min(1).max(100).default(20) }).strict().parse(req.query);
    const data = (await pool.query('SELECT id,actor_id AS "actorId",msg,time FROM activity_log ORDER BY time DESC,id DESC LIMIT $1 OFFSET $2', [limit, offset])).rows;
    res.json({ data, pagination: { limit, offset } });
  });
  const clientDist = fileURLToPath(new URL('../../Client/dist/', import.meta.url));
  if (existsSync(join(clientDist, 'index.html'))) {
    app.use(express.static(clientDist));
    app.get('/{*path}', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/health/')) return next();
      res.sendFile(join(clientDist, 'index.html'));
    });
  }
  app.use((_req, _res, next) => next(new ApiError(404, 'NOT_FOUND', 'Route not found')));
  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    if (res.headersSent) return _next(error);
    let status = 500, code = 'INTERNAL_ERROR', message = 'Internal server error';
    let details: unknown;
    if (error instanceof ApiError) { status = error.status; code = error.code; message = error.message; }
    else if (error instanceof z.ZodError) {
      status = 400; code = 'VALIDATION_ERROR'; message = 'Request validation failed';
      details = error.issues.map(i => ({ path: i.path.join('.'), message: i.message }));
    } else if (error.type === 'entity.parse.failed') { status = 400; code = 'INVALID_JSON'; message = 'Malformed JSON body'; }
    else if (error.type === 'entity.too.large') { status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body too large'; }
    else if (error.code === '23505') { status = 409; code = 'CONFLICT'; message = 'Email, key, or identity already exists'; }
    else if (error.code === '23503') { status = 400; code = 'INVALID_REFERENCE'; message = 'Referenced user, queue, or issue does not exist'; }
    else if (error.code === '23514') { status = 400; code = 'CONSTRAINT_VIOLATION'; message = 'Invalid data'; }
    if (status === 500) req.log.error({ errorType: error.name, errorCode: error.code }, 'Request failed');
    res.status(status).json({ error: { code, message, ...(details ? { details } : {}), requestId: req.id } });
  };
  app.use(errorHandler);
  return app;
}
