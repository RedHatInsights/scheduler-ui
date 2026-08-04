import { apiJobToUIReport, apiRunToUIHistory } from './transforms';
import { fetchExportMetadata } from '../metadata/exportMetadata';
import type { SchedulerJob, SchedulerJobRun } from './types';

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
      format: 'csv',
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
    expect(result.fileType).toBe('CSV');
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
    expect(result.fileType).toBe('Unknown');
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

  it('uppercases the payload format as fileType', () => {
    const result = apiJobToUIReport(makeJob({
      payload: {
        format: 'json',
        sources: [{
          application: 'urn:redhat:application:inventory',
          resource: 'urn:redhat:application:inventory:export:systems',
        }],
      },
    }));
    expect(result.fileType).toBe('JSON');
  });

  it('returns "Unknown" fileType when format is missing', () => {
    const result = apiJobToUIReport(makeJob({
      payload: {
        sources: [{
          application: 'urn:redhat:application:inventory',
          resource: 'urn:redhat:application:inventory:export:systems',
        }],
      },
    }));
    expect(result.fileType).toBe('Unknown');
  });
});

describe('apiRunToUIHistory', () => {
  const mockRun: SchedulerJobRun = {
    id: 'run-1',
    job_id: 'job-1',
    status: 'completed',
    start_time: '2026-09-17T12:00:00Z',
    end_time: '2026-09-17T12:05:00Z',
  };

  it('preserves start_time as runDateTime', () => {
    const result = apiRunToUIHistory(mockRun, 'job-1', 'Test Report');
    expect(result.runDateTime).toBe('2026-09-17T12:00:00Z');
  });

  it('maps basic fields correctly', () => {
    const result = apiRunToUIHistory(mockRun, 'job-1', 'Test Report');
    expect(result.id).toBe('run-1');
    expect(result.reportName).toBe('Test Report');
    expect(result.jobId).toBe('job-1');
    expect(result.runId).toBe('run-1');
    expect(result.status).toBe('completed');
  });

  it('formats runDate as YYYY-MM-DD', () => {
    const result = apiRunToUIHistory(mockRun, 'job-1', 'Test Report');
    expect(result.runDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('preserves error_message as errorMessage', () => {
    const failedRun: SchedulerJobRun = {
      ...mockRun,
      status: 'failed',
      error_message: 'Export timed out',
    };
    const result = apiRunToUIHistory(failedRun, 'job-1', 'Test Report');
    expect(result.status).toBe('failed');
    expect(result.errorMessage).toBe('Export timed out');
  });

  it('maps running status correctly', () => {
    const runningRun: SchedulerJobRun = { ...mockRun, status: 'running' };
    const result = apiRunToUIHistory(runningRun, 'job-1', 'Test Report');
    expect(result.status).toBe('running');
  });

  it('coerces unknown status to completed', () => {
    const pendingRun = { ...mockRun, status: 'pending' } as unknown as SchedulerJobRun;
    const result = apiRunToUIHistory(pendingRun, 'job-1', 'Test Report');
    expect(result.status).toBe('completed');
  });
});
