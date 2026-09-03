import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, rm, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve, dirname, basename } from 'node:path';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import pg from 'pg';

async function freePort() {
  const server = createServer();
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No TCP port allocated');
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return address.port;
}
export async function testDatabase() {
  let url = process.env.TEST_DATABASE_URL;
  let stop: () => Promise<void> = async () => {};
  if (!url) {
    const suffix = process.platform === 'win32' ? '.exe' : '';
    const configured = process.env.PG_BIN;
    const installed = process.platform === 'win32' && existsSync('C:/Program Files/PostgreSQL/17/bin/initdb.exe') ? 'C:/Program Files/PostgreSQL/17/bin' : '';
    const bin = configured || installed;
    const binary = (name: string) => bin ? join(bin, name + suffix) : name + suffix;
    // Do not use pipe stdio for pg_ctl on Windows: the postgres child inherits
    // those handles and would keep execFileSync waiting after readiness.
    const run = (name: string, args: string[]) => execFileSync(binary(name), args, { windowsHide: true, timeout: 30000, stdio: 'ignore' });
    try { run('initdb', ['--version']); }
    catch { throw new Error('Install PostgreSQL and set PG_BIN, or provide TEST_DATABASE_URL for a dedicated test database. No mock DB fallback.'); }
    const tempRoot = await realpath(tmpdir());
    const scratch = await mkdtemp(join(tempRoot, 'tracker-pg-test-'));
    const data = join(scratch, 'data');
    const passwordFile = join(scratch, 'password');
    const password = randomBytes(24).toString('hex');
    const port = await freePort();
    let startAttempted = false;
    stop = async () => {
      if (startAttempted) {
        try { run('pg_ctl', ['-D', data, '-m', 'fast', '-w', '-t', '15', 'stop']); }
        catch { /* It may have failed before creating postmaster.pid. */ }
      }
      // Only this freshly created, exact temporary directory may be removed.
      const target = resolve(scratch);
      if (dirname(target) !== resolve(tempRoot) || !basename(target).startsWith('tracker-pg-test-')) throw new Error('Unsafe temporary cleanup path');
      await rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
    };
    try {
      await writeFile(passwordFile, password, { mode: 0o600 });
      run('initdb', ['-D', data, '-U', 'tracker_test', '--pwfile', passwordFile, '-A', 'scram-sha-256', '--encoding=UTF8', '--locale=C']);
      startAttempted = true;
      run('pg_ctl', ['-D', data, '-l', join(scratch, 'postgres.log'), '-o', `-h 127.0.0.1 -p ${port}`, '-w', '-t', '15', 'start']);
      url = `postgresql://tracker_test:${password}@127.0.0.1:${port}/postgres`;
    } catch (error) { await stop(); throw error; }
  }
  const schema = `tracker_test_${randomBytes(12).toString('hex')}`;
  const admin = new pg.Pool({ connectionString: url, connectionTimeoutMillis: 5000 });
  try { await admin.query(`CREATE SCHEMA "${schema}"`); }
  catch (error) { await admin.end(); await stop(); throw error; }
  const pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}`, max: 12, connectionTimeoutMillis: 5000, statement_timeout: 10000 });
  return {
    pool, url,
    async close() {
      await pool.end();
      try {
        if (!/^tracker_test_[0-9a-f]{24}$/.test(schema)) throw new Error('Unsafe test schema name');
        await admin.query(`DROP SCHEMA "${schema}" CASCADE`);
      } finally { await admin.end(); await stop(); }
    },
  };
}
