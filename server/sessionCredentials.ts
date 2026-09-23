import { randomBytes, timingSafeEqual } from 'node:crypto';

export type CredentialStatus = {
  openai: { configured: boolean; source: 'session' | 'environment' | 'none' };
  jev: { configured: boolean; source: 'session' | 'environment' | 'none' };
};
export type CredentialEnvironment = { OPENAI_API_KEY?: string; TYPESAFE_API_KEY?: string };
export type CredentialUpdate =
  { action: 'connect'; openaiKey?: string; typesafeKey?: string } | { action: 'disconnect' };
export const CREDENTIAL_BODY_LIMIT = 2048;
const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])(?::\d{1,5})?$/i;
const LOOPBACK_ADDRESSES = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1']);

/** Do not trust forwarded headers: the browser Origin must match the actual local Host. */
export function isLocalRequest(
  input: {
    host?: string;
    origin?: string;
    fetchSite?: string;
    remoteAddress?: string;
  },
  requireOrigin = false,
): boolean {
  if (!input.host || !LOOPBACK_HOST.test(input.host)) return false;
  if (input.remoteAddress && !LOOPBACK_ADDRESSES.has(input.remoteAddress)) return false;
  if (input.fetchSite && !['same-origin', 'none'].includes(input.fetchSite)) return false;
  try {
    // URL parsing also rejects ports outside the valid range.
    new URL(`http://${input.host}`);
    if (!input.origin) return !requireOrigin;
    const origin = new URL(input.origin);
    return (
      ['http:', 'https:'].includes(origin.protocol) &&
      !origin.username &&
      !origin.password &&
      origin.pathname === '/' &&
      !origin.search &&
      !origin.hash &&
      origin.origin === new URL(`${origin.protocol}//${input.host}`).origin
    );
  } catch {
    return false;
  }
}

function validKey(key: unknown): key is string {
  return (
    typeof key === 'string' && key.length >= 20 && key.length <= 512 && /^[\x21-\x7e]+$/.test(key)
  );
}
export function parseCredentialUpdate(value: unknown): CredentialUpdate | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  if (input.action === 'disconnect')
    return Object.keys(input).length === 1 ? { action: 'disconnect' } : null;
  if (
    input.action !== 'connect' ||
    Object.keys(input).some((key) => !['action', 'openaiKey', 'typesafeKey'].includes(key))
  )
    return null;
  if (input.openaiKey === undefined && input.typesafeKey === undefined) return null;
  if (input.openaiKey !== undefined && !validKey(input.openaiKey)) return null;
  if (input.typesafeKey !== undefined && !validKey(input.typesafeKey)) return null;
  return {
    action: 'connect',
    ...(input.openaiKey === undefined ? {} : { openaiKey: input.openaiKey as string }),
    ...(input.typesafeKey === undefined ? {} : { typesafeKey: input.typesafeKey as string }),
  };
}

/** One local server session. Private fields cannot accidentally appear in JSON or object logs. */
export class SessionCredentials {
  #keys: { openaiKey?: string; typesafeKey?: string } = {};
  #csrf = randomBytes(32).toString('base64url');
  #environment: () => CredentialEnvironment;
  constructor(environment: () => CredentialEnvironment = () => process.env) {
    this.#environment = environment;
  }
  /** Called only from a guarded same-origin read. It never returns a provider key. */
  handshake() {
    return { csrfToken: this.#csrf, ...this.status() };
  }
  acceptsToken(token: unknown): boolean {
    return (
      typeof token === 'string' &&
      Buffer.byteLength(token) === Buffer.byteLength(this.#csrf) &&
      timingSafeEqual(Buffer.from(token), Buffer.from(this.#csrf))
    );
  }
  status(): CredentialStatus {
    const env = this.#environment();
    const source = (session?: string, environment?: string) =>
      session ? ('session' as const) : environment ? ('environment' as const) : ('none' as const);
    const openai = source(this.#keys.openaiKey, env.OPENAI_API_KEY);
    const jev = source(this.#keys.typesafeKey, env.TYPESAFE_API_KEY);
    return {
      openai: { configured: openai !== 'none', source: openai },
      jev: { configured: jev !== 'none', source: jev },
    };
  }
  apply(update: CredentialUpdate) {
    if (update.action === 'disconnect') this.#keys = {};
    else
      this.#keys = {
        ...this.#keys,
        ...(update.openaiKey ? { openaiKey: update.openaiKey } : {}),
        ...(update.typesafeKey ? { typesafeKey: update.typesafeKey } : {}),
      };
    return this.status();
  }
  /** Server adapters only; never serialize this value into an HTTP response. */
  effective() {
    const env = this.#environment();
    return {
      openaiKey: this.#keys.openaiKey ?? env.OPENAI_API_KEY,
      typesafeKey: this.#keys.typesafeKey ?? env.TYPESAFE_API_KEY,
    };
  }
  disconnect() {
    this.#keys = {};
  }
}
