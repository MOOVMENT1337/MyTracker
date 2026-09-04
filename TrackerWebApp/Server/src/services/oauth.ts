import { createHash } from 'node:crypto';
import { z } from 'zod';
import { ApiError } from '../domain.js';
import { digest, token } from '../security.js';
import { transaction, type Database } from '../db/pool.js';
import type { Config } from '../config.js';
import { getUser, insertUser, issueSession } from './users.js';

export const providerSchema = z.enum(['google', 'yandex', 'mail']);
type Provider = z.infer<typeof providerSchema>;
const providers = {
  google: { authorize: 'https://accounts.google.com/o/oauth2/v2/auth', token: 'https://oauth2.googleapis.com/token', profile: 'https://openidconnect.googleapis.com/v1/userinfo', scope: 'openid email profile', pkce: true },
  yandex: { authorize: 'https://oauth.yandex.ru/authorize', token: 'https://oauth.yandex.ru/token', profile: 'https://login.yandex.ru/info?format=json', scope: 'login:email login:info', pkce: true },
  mail: { authorize: 'https://oauth.mail.ru/login', token: 'https://oauth.mail.ru/token', profile: 'https://oauth.mail.ru/userinfo', scope: 'userinfo', pkce: false },
};
function credentials(config: Config, provider: Provider) {
  const value = config.oauth[provider];
  if (!value?.clientId || !value.clientSecret) throw new ApiError(503, 'OAUTH_NOT_CONFIGURED', `${provider} OAuth is not configured`);
  return value;
}
function redirectUri(config: Config, provider: Provider) {
  return new URL(`/api/auth/oauth/${provider}/callback`, config.PUBLIC_URL).href;
}
export async function startOAuth(pool: Database, config: Config, provider: Provider) {
  const client = credentials(config, provider);
  const spec = providers[provider];
  const state = token();
  const browser = token();
  const verifier = token();
  await pool.query('INSERT INTO oauth_states (state_hash,browser_hash,verifier,provider,expires_at) VALUES ($1,$2,$3,$4,now()+interval \'10 minutes\')', [digest(state), digest(browser), verifier, provider]);
  const url = new URL(spec.authorize);
  url.search = new URLSearchParams({ client_id: client.clientId, redirect_uri: redirectUri(config, provider), response_type: 'code', scope: spec.scope, state }).toString();
  if (spec.pkce) {
    url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
    url.searchParams.set('code_challenge_method', 'S256');
  }
  return { url: url.href, browser };
}
export function parseProfile(provider: Provider, raw: unknown) {
  const data = z.record(z.string(), z.unknown()).parse(raw);
  let subject: unknown;
  let email: unknown;
  let displayName: unknown;
  if (provider === 'google') {
    if (data.email_verified !== true) throw new ApiError(403, 'OAUTH_EMAIL_UNVERIFIED', 'Verified email required');
    subject = data.sub; email = data.email; displayName = data.name;
  } else if (provider === 'yandex') {
    subject = data.id; email = data.default_email; displayName = data.display_name || data.real_name;
  } else {
    subject = data.id; email = data.email; displayName = data.name || [data.first_name, data.last_name].filter(Boolean).join(' ');
  }
  return z.object({ subject: z.string().min(1).max(255), email: z.email().max(254), displayName: z.string().trim().min(1).max(120) })
    .parse({ subject: typeof subject === 'number' ? String(subject) : subject, email: typeof email === 'string' ? email.toLowerCase() : email, displayName: displayName || email });
}
async function fetchJson(url: string, options: RequestInit, request: typeof fetch) {
  try {
    const response = await request(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error('Upstream rejected request');
    return await response.json();
  } catch {
    throw new ApiError(502, 'OAUTH_PROVIDER_ERROR', 'OAuth provider request failed');
  }
}
export async function finishOAuth(pool: Database, config: Config, provider: Provider, code: string, state: string, browser: string, request: typeof fetch = fetch) {
  const client = credentials(config, provider);
  const spec = providers[provider];
  const stored = (await pool.query(`DELETE FROM oauth_states WHERE state_hash=$1 AND browser_hash=$2
    AND provider=$3 AND expires_at>now() RETURNING verifier`, [digest(state), digest(browser), provider])).rows[0];
  if (!stored) throw new ApiError(400, 'INVALID_OAUTH_STATE', 'OAuth state expired, invalid, or already used');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, client_id: client.clientId, client_secret: client.clientSecret, redirect_uri: redirectUri(config, provider) });
  if (spec.pkce) body.set('code_verifier', stored.verifier);
  const rawToken = await fetchJson(spec.token, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } }, request);
  const parsedToken = z.object({ access_token: z.string().min(1) }).safeParse(rawToken);
  if (!parsedToken.success) throw new ApiError(502, 'OAUTH_PROVIDER_ERROR', 'OAuth provider returned an invalid token response');
  const rawProfile = await fetchJson(spec.profile, { headers: { Authorization: `${provider === 'yandex' ? 'OAuth' : 'Bearer'} ${parsedToken.data.access_token}` } }, request);
  let profile: ReturnType<typeof parseProfile>;
  try { profile = parseProfile(provider, rawProfile); }
  catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(502, 'OAUTH_PROFILE_INVALID', 'OAuth profile is missing required identity fields');
  }
  return transaction(pool, async db => {
    await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`${provider}:${profile.subject}`]);
    const existing = (await db.query('SELECT user_id FROM oauth_identities WHERE provider=$1 AND subject=$2', [provider, profile.subject])).rows[0];
    if (existing) return issueSession(db, await getUser(db, existing.user_id), config.SESSION_TTL_HOURS);
    // Never link by email alone: prevents taking over an existing local/provider account.
    if ((await db.query('SELECT id FROM users WHERE email=$1', [profile.email])).rowCount) throw new ApiError(409, 'ACCOUNT_LINK_REQUIRED', 'Email already registered; sign in using the original method');
    const user = await insertUser(db, { ...profile, passwordHash: null, provider });
    await db.query('INSERT INTO oauth_identities (provider,subject,user_id) VALUES ($1,$2,$3)', [provider, profile.subject, user.id]);
    return issueSession(db, user, config.SESSION_TTL_HOURS);
  });
}
