import assert from "node:assert/strict";
import test from "node:test";
import {
  createPool,
  removeConnectionStringSslParameters,
} from "../src/db/pool.js";
import { readConfig } from "../src/config.js";

test("explicit TLS settings take precedence over connection-string SSL parameters", async () => {
  const config = readConfig({
    NODE_ENV: "test",
    DATABASE_URL:
      "postgresql://user:password@example.com:5432/database?sslmode=require&uselibpqcompat=true&application_name=from-url",
    DATABASE_SSL: "true",
  });

  const pool = createPool(config);
  try {
    const url = new URL(String(pool.options.connectionString));
    assert.equal(url.searchParams.has("sslmode"), false);
    assert.equal(url.searchParams.has("uselibpqcompat"), false);
    assert.equal(url.searchParams.get("application_name"), "from-url");
    assert.deepEqual(pool.options.ssl, { rejectUnauthorized: true });
  } finally {
    await pool.end();
  }
});

test("connection-string SSL settings are preserved when application SSL is disabled", async () => {
  const connectionString =
    "postgresql://user:password@example.com:5432/database?sslmode=require";
  const config = readConfig({
    NODE_ENV: "test",
    DATABASE_URL: connectionString,
    DATABASE_SSL: "false",
  });
  const pool = createPool(config);

  try {
    assert.equal(pool.options.connectionString, connectionString);
    assert.equal(pool.options.ssl, undefined);
  } finally {
    await pool.end();
  }
});
