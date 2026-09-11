import { attachDatabasePool } from "@vercel/functions";
import { fileURLToPath } from "node:url";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createPool } from "./db/pool.js";

process.env.DATABASE_SSL_CA ||= fileURLToPath(
  new URL("../../../deploy/supabase-ca.crt", import.meta.url),
);

const deploymentHost = process.env.VERCEL_URL;
const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const publicHost = productionHost ?? deploymentHost;
const frontendHost = deploymentHost ?? productionHost;

if (publicHost) process.env.PUBLIC_URL ||= `https://${publicHost}`;
if (frontendHost) process.env.FRONTEND_URL ||= `https://${frontendHost}`;
process.env.CORS_ORIGINS ||= [deploymentHost, productionHost]
  .filter((host): host is string => Boolean(host))
  .map((host) => `https://${host}`)
  .join(",");
process.env.DATABASE_URL ||= process.env.POSTGRES_URL;

const config = readConfig();
const pool = createPool(config);

attachDatabasePool(pool);

export default createApp(pool, config);
