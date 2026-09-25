import { createHash } from 'node:crypto';

const targets = {
  stage: 'https://console.stage.redhat.com',
  production: 'https://console.redhat.com',
  proxy: 'https://stage.foo.redhat.com:1337',
};

export function resolveEnvironment(env: NodeJS.ProcessEnv = process.env) {
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
