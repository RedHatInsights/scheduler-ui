import { apiJobToUIReport } from './transforms';
import { fetchExportMetadata } from '../metadata/exportMetadata';
import type { SchedulerJob } from './types';

jest.mock('cronstrue', () => ({
  toString: (cron: string) => `every ${cron}`,
}));

const TEST_METADATA = [
  {
    id: 'inventory',
    application: 'urn:redhat:application:inventory',
    displayName: 'Inventory',
    resources: [
      { id: 'export-systems', resource: 'urn:redhat:application:inventory:export:systems', format: ['csv', 'json'], displayName: 'Export Systems' },
    ],
  },
  {
    id: 'subscriptions',
    application: 'subscriptions',
    displayName: 'Subscriptions',
    resources: [
      { id: 'instances', resource: 'instances', format: ['csv'], displayName: 'Instances' },
    ],
  },
];

const originalFetch = global.fetch;
const originalAbortSignalTimeout = AbortSignal.timeout;

beforeAll(async () => {
  if (!AbortSignal.timeout) {
    AbortSignal.timeout = () => new AbortController().signal;
  }
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => TEST_METADATA,
  });
  await fetchExportMetadata();
});

afterAll(() => {
  global.fetch = originalFetch;
  if (originalAbortSignalTimeout) {
    AbortSignal.timeout = originalAbortSignalTimeout;
  } else {
    delete (AbortSignal as Partial<typeof AbortSignal>).timeout;
  }
});

function makeJob(overrides: Partial<SchedulerJob> = {}): SchedulerJob {
  return {
    id: 'job-1',
    name: 'Test Report',
    schedule: '0 0 * * 5',
    type: 'export',
    status: 'scheduled',
    payload: {
      sources: [{
        application: 'urn:redhat:application:inventory',
        resource: 'urn:redhat:application:inventory:export:systems',
      }],
    },
    ...overrides,
  } as SchedulerJob;
}

describe('apiJobToUIReport', () => {
  it('maps inventory URN to display names', () => {
    const result = apiJobToUIReport(makeJob());
    expect(result.services).toEqual(['Inventory']);
    expect(result.task).toBe('Export Systems');
  });

  it('maps subscriptions URN to display names', () => {
    const result = apiJobToUIReport(makeJob({
      payload: {
        sources: [{
          application: 'subscriptions',
          resource: 'instances',
        }],
      },
    }));
    expect(result.services).toEqual(['Subscriptions']);
    expect(result.task).toBe('Instances');
  });

  it('returns "Unknown" when sources is missing', () => {
    const result = apiJobToUIReport(makeJob({ payload: {} }));
    expect(result.services).toEqual(['Unknown']);
    expect(result.task).toBe('Unknown');
  });

  it('returns "Unknown" for unrecognized URNs', () => {
    const result = apiJobToUIReport(makeJob({
      payload: {
        sources: [{
          application: 'urn:redhat:application:unknown',
          resource: 'urn:unknown:resource',
        }],
      },
    }));
    expect(result.services).toEqual(['Unknown']);
    expect(result.task).toBe('Unknown');
  });

  it('preserves id, name, status, and frequency', () => {
    const result = apiJobToUIReport(makeJob({
      status: 'running',
      last_run_at: '2025-07-25T00:00:00Z',
    }));
    expect(result.id).toBe('job-1');
    expect(result.name).toBe('Test Report');
    expect(result.status).toBe('Running');
    expect(result.frequency).toBe('every 0 0 * * 5');
  });

  it('shows "Never" when last_run_at is absent', () => {
    const result = apiJobToUIReport(makeJob());
    expect(result.datetime).toBe('Never');
  });
});
