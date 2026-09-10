import { attachDatabasePool } from "@vercel/functions";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createPool } from "./db/pool.js";

process.env.DATABASE_SSL_CA ||= fileURLToPath(
  new URL("../../../deploy/supabase-ca.crt", import.meta.url),
);

const config = readConfig();
const pool = createPool(config);

attachDatabasePool(pool);

export default createApp(pool, config);
