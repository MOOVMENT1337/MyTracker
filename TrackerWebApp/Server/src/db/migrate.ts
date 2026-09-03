import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { transaction, type Database } from './pool.js';

// Both src/db and dist/db resolve to Server/migrations.
const directory = fileURLToPath(new URL('../../migrations/', import.meta.url));
export async function migrate(pool: Database) {
  await transaction(pool, async client => {
    await client.query("SELECT pg_advisory_xact_lock(hashtext(current_schema() || ':tracker-migrations'))");
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    for (const name of (await readdir(directory)).filter(v => /^\d+.*\.sql$/.test(v)).sort()) {
      const sql = await readFile(`${directory}/${name}`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM schema_migrations WHERE name=$1', [name]);
      if (existing.rows[0]) {
        if (existing.rows[0].checksum !== checksum) throw new Error(`Applied migration modified: ${name}`);
        continue;
      }
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1,$2)', [name, checksum]);
    }
  });
}
