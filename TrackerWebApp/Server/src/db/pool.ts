import pg from 'pg';
import type { Config } from '../config.js';
export type Database = pg.Pool;
export type Connection = pg.PoolClient;
export type Queryable = Pick<pg.PoolClient, 'query'>;
export function createPool(config: Config) {
  return new pg.Pool({
    connectionString: config.DATABASE_URL,
    ssl: config.DATABASE_SSL === 'true' ? { rejectUnauthorized: true } : undefined,
    max: 10, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000,
    statement_timeout: 10000, application_name: 'tracker-server',
  });
}
export async function transaction<T>(pool: Database, work: (client: Connection) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}
