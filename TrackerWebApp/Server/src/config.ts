import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('127.0.0.1'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z.string().url().refine(v => /^postgres(ql)?:/.test(v), 'PostgreSQL URL required'),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  PUBLIC_URL: z.string().url().default('http://localhost:3000'),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(720).default(168),
  TRUST_PROXY_HOPS: z.coerce.number().int().min(0).max(5).default(0),
  LOG_LEVEL: z.enum(['silent', 'fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  ALLOW_DEMO_SEED: z.enum(['true', 'false']).default('false'),
});

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const parsed = envSchema.safeParse(env);
  if (!parsed.success) throw new Error(`Invalid environment: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
  const value = parsed.data;
  if (value.NODE_ENV === 'production' && new URL(value.PUBLIC_URL).protocol !== 'https:') {
    throw new Error('PUBLIC_URL must use HTTPS in production');
  }
  return {
    ...value,
    corsOrigins: value.CORS_ORIGINS.split(',').map(v => v.trim()).filter(Boolean),
    oauth: Object.fromEntries(['google', 'yandex', 'mail'].map(provider => [provider, {
      clientId: env[`${provider.toUpperCase()}_CLIENT_ID`] || '',
      clientSecret: env[`${provider.toUpperCase()}_CLIENT_SECRET`] || '',
    }])),
  };
}
export type Config = ReturnType<typeof readConfig>;
