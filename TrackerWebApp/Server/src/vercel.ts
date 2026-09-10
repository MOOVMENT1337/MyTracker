import { attachDatabasePool } from "@vercel/functions";
import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { createPool } from "./db/pool.js";

const config = readConfig();
const pool = createPool(config);

attachDatabasePool(pool);

export default createApp(pool, config);
