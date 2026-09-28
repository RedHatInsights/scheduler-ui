import { createHash } from 'node:crypto';

const targets = {
  stage: 'https://console.stage.redhat.com',
  production: 'https://console.redhat.com',
  proxy: 'https://stage.foo.redhat.com:1337',
};

export interface TestEnvironment {
  target: string;
  baseURL: string;
  ignoreHTTPSErrors: boolean;
  storageState: string;
  proxy?: { server: string; bypass?: string };
}

export interface ConsumerNavigationStep {
  role: 'button' | 'link' | 'menuitem';
  name: string;
}

function isConsumerNavigationStep(value: unknown): value is ConsumerNavigationStep {
  return typeof value === 'object' && value !== null && !Array.isArray(value) &&
    'role' in value && (value.role === 'button' || value.role === 'link' || value.role === 'menuitem') &&
    'name' in value && typeof value.name === 'string' && value.name.trim().length > 0;
}

/** Validate all configured UI clicks before starting consumer navigation. */
export function parseConsumerNavigation(navigation: string): ConsumerNavigationStep[] {
  const message = 'E2E_CONSUMER_NAVIGATION must be a nonempty JSON array of steps with role (button/link/menuitem) and a nonempty accessible name.';
  let parsed: unknown;
  try {
    parsed = JSON.parse(navigation);
  } catch {
    throw new Error(message);
  }
  if (!Array.isArray(parsed) || parsed.length === 0) throw new Error(message);
  const steps: unknown[] = parsed;
  if (!steps.every(isConsumerNavigationStep)) throw new Error(message);
  return steps;
}

/** Resolve the browser origin and isolate its authentication state. */
export function resolveEnvironment(env: NodeJS.ProcessEnv = process.env): TestEnvironment {
  const target = env.E2E_TARGET || 'stage';
  if (!Object.prototype.hasOwnProperty.call(targets, target)) throw new Error('E2E_TARGET must be stage, production, or proxy.');
  const baseURL = env.PLAYWRIGHT_BASE_URL || targets[target as keyof typeof targets];
  let url: URL;
  try {
    url = new URL(baseURL);
  } catch {
    throw new Error('PLAYWRIGHT_BASE_URL must be a valid HTTP(S) origin.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
      url.pathname !== '/' || url.search || url.hash) {
    throw new Error('PLAYWRIGHT_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
  }
  // Separate sessions for stage, production and custom proxy origins.
  const originKey = createHash('sha256').update(url.origin).digest('hex').slice(0, 12);
  return {
    target,
    baseURL: url.origin,
    ignoreHTTPSErrors: target === 'proxy',
    storageState: `playwright/.auth/${target}-${originKey}.json`,
    proxy: env.PLAYWRIGHT_PROXY_SERVER ? {
      server: env.PLAYWRIGHT_PROXY_SERVER,
      bypass: env.PLAYWRIGHT_PROXY_BYPASS,
    } : undefined,
  };
}

/** Require a consumer destination on the configured console origin. */
export function resolveConsumerDestination(path: string, baseURL: string): string {
  const message = 'E2E_CONSUMER_PATH must be an absolute application path on the configured console origin.';
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('\\') ||
      Array.from(path).some(character => character.charCodeAt(0) <= 31 || character.charCodeAt(0) === 127)) {
    throw new Error(message);
  }
  const base = new URL(baseURL);
  const destination = new URL(path, base);
  if (destination.origin !== base.origin || destination.username || destination.password) throw new Error(message);
  return destination.href;
}
