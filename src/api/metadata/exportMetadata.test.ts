import {
  fetchExportMetadata,
  getServices,
  getServiceDisplayName,
  getTaskDisplayName,
} from './exportMetadata';

if (typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(new DOMException('TimeoutError')), ms);
    return controller.signal;
  };
}

const VALID_METADATA = [
  {
    id: 'advisor',
    application: 'urn:redhat:application:advisor',
    displayName: 'Advisor',
    resources: [
      { id: 'systems', resource: 'urn:redhat:application:advisor:export:systems', format: ['csv', 'json'], displayName: 'Systems' },
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

beforeEach(() => {
  jest.restoreAllMocks();
});

describe('fetchExportMetadata', () => {
  it('loads valid metadata and populates accessors', async () => {
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
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => VALID_METADATA,
    } as Response);

    await fetchExportMetadata();

    expect(getServiceDisplayName('vulnerability')).toBe('vulnerability');
    expect(getTaskDisplayName('vulnerability', 'cves')).toBe('cves');
  });

  it('throws on non-OK HTTP response', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 503,
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('HTTP error! status: 503');
  });

  it('throws on malformed JSON (not an array)', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ unexpected: 'object' }),
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when service entry is missing required fields', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [{ id: 'svc' }],
    } as Response);

    await expect(fetchExportMetadata()).rejects.toThrow('Invalid export metadata format');
  });

  it('throws when resource entry is malformed', async () => {
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

  it('passes AbortSignal timeout to fetch', async () => {
    const fetchSpy = jest.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);

    await fetchExportMetadata();

    const signal = fetchSpy.mock.calls[0][1]?.signal;
    expect(signal).toBeDefined();
  });
});
