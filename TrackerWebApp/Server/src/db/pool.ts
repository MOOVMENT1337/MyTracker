import pg from "pg";
import { readFileSync } from "node:fs";
import type { Config } from "../config.js";

export type Database = pg.Pool;
export type Connection = pg.PoolClient;
export type Queryable = Pick<pg.PoolClient, "query">;

const connectionStringSslParameters = [
  "ssl",
  "sslmode",
  "sslcert",
  "sslkey",
  "sslrootcert",
  "uselibpqcompat",
] as const;

export function removeConnectionStringSslParameters(connectionString: string) {
  const url = new URL(connectionString);
  for (const parameter of connectionStringSslParameters)
    url.searchParams.delete(parameter);
  return url.toString();
}

export function createPool(config: Config) {
  const ssl =
    config.DATABASE_SSL === "true"
      ? {
          rejectUnauthorized: true,
          ...(config.DATABASE_SSL_CA
            ? { ca: readFileSync(config.DATABASE_SSL_CA, "utf8") }
            : {}),
        }
      : undefined;

  return new pg.Pool({
    // pg-connection-string gives SSL parameters embedded in the URL precedence
    // over this explicit TLS configuration. Vercel's Supabase integration adds
    // sslmode=require, so remove only the URL-level TLS options when application
    // SSL is enabled and keep certificate verification controlled here.
    connectionString: ssl
      ? removeConnectionStringSslParameters(config.DATABASE_URL)
      : config.DATABASE_URL,
    ssl,
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 10000,
    application_name: "tracker-server",
  });
}

export async function transaction<T>(
  pool: Database,
  work: (client: Connection) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await work(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
