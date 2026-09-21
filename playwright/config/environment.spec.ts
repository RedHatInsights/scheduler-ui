import { test, expect } from '@playwright/test';
import { resolveEnvironment } from '../setup/environment';

test('stage and production validate TLS while the sidecar proxy accepts its internal certificate', () => {
  expect(resolveEnvironment({})).toMatchObject({ baseURL: 'https://console.stage.redhat.com', ignoreHTTPSErrors: false });
  expect(resolveEnvironment({ E2E_TARGET: 'production' })).toMatchObject({ baseURL: 'https://console.redhat.com', ignoreHTTPSErrors: false });
  expect(resolveEnvironment({ E2E_TARGET: 'proxy' })).toMatchObject({ baseURL: 'https://stage.foo.redhat.com:1337', ignoreHTTPSErrors: true });
});

test('custom origins override the target default without reading infrastructure-only HCC_ENV_URL', () => {
  const env = resolveEnvironment({ E2E_TARGET: 'proxy', PLAYWRIGHT_BASE_URL: 'https://prod.foo.redhat.com:1443/', HCC_ENV_URL: 'https://upstream.invalid' });
  expect(env.baseURL).toBe('https://prod.foo.redhat.com:1443');
  expect(resolveEnvironment({ E2E_TARGET: 'proxy', HCC_ENV_URL: 'https://upstream.invalid' }).baseURL).toBe('https://stage.foo.redhat.com:1337');
});

test('auth state is isolated across targets and custom proxy origins', () => {
  const states = [
    resolveEnvironment({ E2E_TARGET: 'stage' }),
    resolveEnvironment({ E2E_TARGET: 'production' }),
    resolveEnvironment({ E2E_TARGET: 'proxy' }),
    resolveEnvironment({ E2E_TARGET: 'proxy', PLAYWRIGHT_BASE_URL: 'https://prod.foo.redhat.com:1337' }),
  ].map(env => env.storageState);
  expect(new Set(states).size).toBe(4);
});

test('reject invalid targets and URL values without echoing embedded credentials', () => {
  expect(() => resolveEnvironment({ E2E_TARGET: 'typo' })).toThrow('E2E_TARGET must be');
  for (const url of ['invalid', 'file:///tmp/index.html', 'https://user:password@example.com', 'https://example.com/path', 'https://example.com/?token=secret']) {
    expect(() => resolveEnvironment({ PLAYWRIGHT_BASE_URL: url })).toThrow(/PLAYWRIGHT_BASE_URL must be/);
  }
});

test('explicit forward proxy settings are shared with the auth setup via config.use', () => {
  expect(resolveEnvironment({ PLAYWRIGHT_PROXY_SERVER: 'http://proxy.example:3128', PLAYWRIGHT_PROXY_BYPASS: 'localhost' }).proxy)
    .toEqual({ server: 'http://proxy.example:3128', bypass: 'localhost' });
});
