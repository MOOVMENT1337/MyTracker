import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const params = { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
function derive(password: string, salt: string) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, 64, params, (error, key) => error ? reject(error) : resolve(key));
  });
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `scrypt$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
export async function verifyPassword(password: string, hash: string | null) {
  // Same expensive derivation for missing/social accounts to reduce enumeration by timing.
  const [, salt, expected] = (hash || 'scrypt$00000000000000000000000000000000$' + '00'.repeat(64)).split('$');
  const actual = await derive(password, salt!);
  const bytes = Buffer.from(expected!, 'hex');
  return bytes.length === actual.length && timingSafeEqual(bytes, actual) && hash !== null;
}
export const token = () => randomBytes(32).toString('base64url');
export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
