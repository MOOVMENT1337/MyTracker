import { attachDatabasePool } from "@vercel/functions";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createPool } from "./db/pool.js";

process.env.DATABASE_SSL_CA ||= fileURLToPath(
  new URL("../../../deploy/supabase-ca.crt", import.meta.url),
);

const vercelHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

if (vercelHost) {
  const vercelOrigin = `https://${vercelHost}`;
  process.env.PUBLIC_URL ||= vercelOrigin;
  process.env.FRONTEND_URL ||= vercelOrigin;
  process.env.CORS_ORIGINS ||= vercelOrigin;
}

const config = readConfig();
const pool = createPool(config);

attachDatabasePool(pool);

export default createApp(pool, config);
