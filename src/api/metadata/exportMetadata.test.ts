/* eslint-disable @typescript-eslint/no-require-imports */

const VALID_METADATA = [
  {
    id: 'advisor',
    application: 'urn:redhat:application:advisor',
    displayName: 'Advisor',
    resources: [
      {
        id: 'systems',
        resource: 'urn:redhat:application:advisor:export:systems',
        format: ['csv', 'json'],
        displayName: 'Systems',
        variants: [
          { id: 'rhel-arm', displayName: 'RHEL ARM', filters: { product_id: 'RHEL ARM' } },
        ],
      },
    ],
  },
  {
    id: 'vulnerability',
    application: 'urn:redhat:application:vulnerability',
    resources: [
      { id: 'cves', resource: 'urn:redhat:application:vulnerability:export:cves', format: ['json'] },
    ],
  },
];

const originalTimeout = AbortSignal.timeout;

beforeAll(() => {
  if (typeof AbortSignal.timeout !== 'function') {
    AbortSignal.timeout = (ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(new DOMException('TimeoutError')), ms);
      return controller.signal;
    };
  }
});

afterAll(() => {
  AbortSignal.timeout = originalTimeout;
});

function loadModule() {
  let mod: typeof import('./exportMetadata');
  jest.isolateModules(() => {
    mod = require('./exportMetadata');
  });
  return mod!;
}

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('fetchExportMetadata', () => {
  it('loads valid metadata and populates accessors', async () => {
    const { fetchExportMetadata, getServices, getServiceDisplayName, getTaskDisplayName } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_METADATA,
    } as Response);

    await fetchExportMetadata();

    expect(getServices()).toEqual(['advisor', 'vulnerability']);
    expect(getServiceDisplayName('advisor')).toBe('Advisor');
    expect(getTaskDisplayName('advisor', 'systems')).toBe('Systems');
  });

  it('falls back to raw ID when displayName is missing', async () => {
    const { fetchExportMetadata, getServiceDisplayName, getTaskDisplayName } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_METADATA,
    } as Response);

    await fetchExportMetadata();

    expect(getServiceDisplayName('vulnerability')).toBe('vulnerability');
    expect(getTaskDisplayName('vulnerability', 'cves')).toBe('cves');
  });

  it('starts with empty metadata before fetch', () => {
    const { getServices } = loadModule();
    expect(getServices()).toEqual([]);
  });

  it('isolates metadata between tests', async () => {
    const { fetchExportMetadata, getServices } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_METADATA,
    } as Response);

    await fetchExportMetadata();
    expect(getServices()).toHaveLength(2);

    // New module instance starts fresh
    const { getServices: getServices2 } = loadModule();
    expect(getServices2()).toEqual([]);
  });

  it('throws on non-OK HTTP response', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('HTTP error! status: 503');
  });

  it('throws on malformed JSON (not an array)', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: 'object' }),
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when service entry is missing required fields', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'svc' }],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when resource entry is malformed', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'svc',
          application: 'urn:app',
          resources: [{ id: 123 }],
        },
      ],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when resource format contains non-strings', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'svc',
          application: 'urn:app',
          resources: [{ id: 'r1', resource: 'urn:r1', format: [42] }],
        },
      ],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when displayName is a non-string value', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'svc',
          application: 'urn:app',
          displayName: 42,
          resources: [{ id: 'r1', resource: 'urn:r1', format: ['json'] }],
        },
      ],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when resource displayName is a non-string value', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'svc',
          application: 'urn:app',
          resources: [{ id: 'r1', resource: 'urn:r1', format: ['json'], displayName: { name: 'bad' } }],
        },
      ],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('exposes variant accessors for a resource that has variants', async () => {
    const { fetchExportMetadata, getVariants, getVariantDisplayName, getVariantFilters, findVariantIdFromFilters } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_METADATA,
    } as Response);

    await fetchExportMetadata();

    expect(getVariants('advisor', 'systems').map((v) => v.id)).toEqual(['rhel-arm']);
    expect(getVariantDisplayName('advisor', 'systems', 'rhel-arm')).toBe('RHEL ARM');
    expect(getVariantFilters('advisor', 'systems', 'rhel-arm')).toEqual({ product_id: 'RHEL ARM' });
    expect(findVariantIdFromFilters('advisor', 'systems', { product_id: 'RHEL ARM' })).toBe('rhel-arm');
  });

  it('returns empty/undefined variants for a resource without variants', async () => {
    const { fetchExportMetadata, getVariants, getVariantFilters, findVariantIdFromFilters } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_METADATA,
    } as Response);

    await fetchExportMetadata();

    expect(getVariants('vulnerability', 'cves')).toEqual([]);
    expect(getVariantFilters('vulnerability', 'cves', 'anything')).toBeUndefined();
    expect(findVariantIdFromFilters('advisor', 'systems', { product_id: 'no-match' })).toBe('');
  });

  it('throws when a variant is missing filters', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'svc',
          application: 'urn:app',
          resources: [{ id: 'r1', resource: 'urn:r1', format: ['json'], variants: [{ id: 'v1' }] }],
        },
      ],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when variant filters contain non-string values', async () => {
    const { fetchExportMetadata } = loadModule();
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'svc',
          application: 'urn:app',
          resources: [{ id: 'r1', resource: 'urn:r1', format: ['json'], variants: [{ id: 'v1', filters: { product_id: 42 } }] }],
        },
      ],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('passes AbortSignal timeout to fetch', async () => {
    const { fetchExportMetadata } = loadModule();
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchExportMetadata();

    const signal = fetchSpy.mock.calls[0][1]?.signal;
    expect(signal).toBeDefined();
  });
});
