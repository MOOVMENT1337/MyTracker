import { createApp } from './app.js';
import { readConfig } from './config.js';
import { createPool } from './db/pool.js';
import { pino } from 'pino';

const config = readConfig();
const logger = pino({ level: config.LOG_LEVEL });
const pool = createPool(config);
pool.on('error', error => logger.error({ errorType: error.name }, 'Unexpected idle PostgreSQL connection error'));
await pool.query('SELECT 1 FROM schema_migrations LIMIT 1');
const server = createApp(pool, config).listen(config.PORT, config.HOST, () => logger.info({ port: config.PORT, host: config.HOST }, 'Tracker API listening'));
server.requestTimeout = 30000;
server.headersTimeout = 15000;
const cleanup = setInterval(() => {
  Promise.all([pool.query('DELETE FROM sessions WHERE expires_at<=now()'), pool.query('DELETE FROM oauth_states WHERE expires_at<=now()')])
    .catch(error => logger.error({ errorType: error.name }, 'Session cleanup failed'));
}, 3600000).unref();
let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  clearInterval(cleanup);
  const deadline = setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000).unref();
  server.close(async () => { await pool.end(); clearTimeout(deadline); logger.info('Tracker API stopped'); });
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
