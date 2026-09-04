import { z } from 'zod';
import { readConfig } from '../config.js';
import { createPool, transaction } from './pool.js';
import { migrate } from './migrate.js';
import { seedAdmin, seedDemo } from './seed.js';
import { insertUser } from '../services/users.js';
import { hashPassword } from '../security.js';

const config = readConfig();
const pool = createPool(config);
try {
  switch (process.argv[2]) {
    case 'migrate': await migrate(pool); console.log('Migrations applied.'); break;
    case 'seed': console.log(await seedAdmin(pool, config)); break;
    case 'seed-full-demo': console.log(await seedDemo(pool, config)); break;
    case 'admin': {
      const data = z.object({
        ADMIN_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
        ADMIN_PASSWORD: z.string().min(12).max(128),
        ADMIN_DISPLAY_NAME: z.string().trim().min(1).max(120).default('Administrator'),
      }).parse(process.env);
      const passwordHash = await hashPassword(data.ADMIN_PASSWORD);
      await transaction(pool, db => insertUser(db, { email: data.ADMIN_EMAIL, displayName: data.ADMIN_DISPLAY_NAME,
        passwordHash, isAdmin: true }));
      console.log('Administrator created. Existing users were not modified.');
      break;
    }
    default: throw new Error('Expected migrate, seed, seed-full-demo, or admin');
  }
} catch (error) {
  // Avoid printing configuration values or database error details containing credentials.
  console.error(error instanceof z.ZodError ? 'Invalid administrator settings' : (error as Error).message);
  process.exitCode = 1;
} finally { await pool.end(); }
