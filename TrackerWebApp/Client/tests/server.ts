// Isolated E2E server; never uses DATABASE_URL or the developer's database.
import express from "../../Server/node_modules/express/index.js";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createApp } from "../../Server/src/app.js";
import { readConfig } from "../../Server/src/config.js";
import { migrate } from "../../Server/src/db/migrate.js";
import { seedAdmin, seedDemo } from "../../Server/src/db/seed.js";
import { testDatabase } from "../../Server/test/database.js";

const db = await testDatabase();
const config = readConfig({
  NODE_ENV: "test",
  DATABASE_URL: db.url,
  LOG_LEVEL: "silent",
  ALLOW_DEMO_SEED: "true",
  PUBLIC_URL: "http://127.0.0.1:4173",
  FRONTEND_URL: "http://127.0.0.1:4173",
  CORS_ORIGINS: "http://127.0.0.1:4173",
});
await migrate(db.pool);
if (process.env.TRACKER_TEST_EMPTY === "1") {
  await seedAdmin(db.pool, config);
} else {
  // Explicit legacy visual fixtures only; regular startup never loads this data.
  await seedDemo(db.pool, config);
  await db.pool.query("UPDATE users SET theme='light',language='en'");
}
const app = express();
const legacy = fileURLToPath(new URL("../../../html+css+js/", import.meta.url));
app.get("/reference/", async (_req, res) => {
  let html = await readFile(legacy + "/index.html", "utf8");
  // The downloaded Cloudflare challenge is unrelated to the app and has no local endpoint.
  html = html.replace(/<script>\(function\(\).*?<\/script>/s, "");
  html = html.replace(
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css",
    "/test-icons/css/all.min.css",
  );
  html = html.replace(
    /<link href="https:\/\/fonts.googleapis.com[^>]+>/,
    [400, 500, 600, 700]
      .map(
        (weight) => `<link rel="stylesheet" href="/test-fonts/${weight}.css">`,
      )
      .join(""),
  );
  res.type("html").send(html);
});
app.use("/reference", express.static(legacy));
app.use(
  "/test-icons",
  express.static(
    fileURLToPath(
      new URL(
        "../node_modules/@fortawesome/fontawesome-free/",
        import.meta.url,
      ),
    ),
  ),
);
app.use(
  "/test-fonts",
  express.static(
    fileURLToPath(
      new URL("../node_modules/@fontsource/inter/", import.meta.url),
    ),
  ),
);
let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;
  await db.close();
  server.close(() => process.exit(0));
}
app.post("/__test/shutdown", (_req, res) => {
  res.sendStatus(204);
  setTimeout(() => {
    void stop();
  }, 50);
});
app.use(createApp(db.pool, config));
const server = app.listen(4173, "127.0.0.1", () =>
  process.stdout.write("Isolated UI server ready on http://127.0.0.1:4173\n"),
);
process.on("SIGTERM", () => {
  void stop();
});
process.on("SIGINT", () => {
  void stop();
});
