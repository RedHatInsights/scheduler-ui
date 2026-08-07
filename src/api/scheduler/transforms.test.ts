import { apiJobToUIReport, apiRunToUIHistory, uiReportDataToApiRequest } from './transforms';
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

  it('maps multiple sources to multiple service names', () => {
    const result = apiJobToUIReport(makeJob({
      payload: {
        format: 'csv',
        sources: [
          { application: 'urn:redhat:application:inventory', resource: 'urn:redhat:application:inventory:export:systems' },
          { application: 'subscriptions', resource: 'instances' },
        ],
      },
    }));
    expect(result.services).toEqual(['Inventory', 'Subscriptions']);
  });

  it('deduplicates service names when same service appears in multiple sources', () => {
    const result = apiJobToUIReport(makeJob({
      payload: {
        format: 'csv',
        sources: [
          { application: 'urn:redhat:application:inventory', resource: 'urn:redhat:application:inventory:export:systems' },
          { application: 'urn:redhat:application:inventory', resource: 'urn:redhat:application:inventory:export:hosts' },
        ],
      },
    }));
    expect(result.services).toEqual(['Inventory']);
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

  it('preserves timezone from job', () => {
    const result = apiJobToUIReport(makeJob({
      timezone: 'Europe/London',
    }));
    expect(result.timezone).toBe('Europe/London');
  });

  it('falls back to user timezone when job.timezone is missing', () => {
    const realOptions = new Intl.DateTimeFormat().resolvedOptions();
    const spy = jest.spyOn(Intl.DateTimeFormat.prototype, 'resolvedOptions').mockReturnValue({
      ...realOptions,
      timeZone: 'America/Chicago',
    });

    const result = apiJobToUIReport(makeJob());
    expect(result.timezone).toBe('America/Chicago');

    spy.mockRestore();
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

describe('uiReportDataToApiRequest', () => {
  it('maps single job via legacy service/task fields', () => {
    const result = uiReportDataToApiRequest({
      reportName: 'My Report',
      fileType: 'CSV',
      service: 'inventory',
      task: 'export-systems',
      cronExpression: '0 0 * * 0',
    });

    expect(result.name).toBe('My Report');
    expect(result.schedule).toBe('0 0 * * 0');
    expect(result.type).toBe('export');
    expect(result.payload.format).toBe('csv');
    expect(result.payload.sources).toHaveLength(1);
    expect(result.payload.sources[0].application).toBe('urn:redhat:application:inventory');
    expect(result.payload.sources[0].resource).toBe('urn:redhat:application:inventory:export:systems');
  });

  it('maps multi-job via jobs array', () => {
    const result = uiReportDataToApiRequest({
      reportName: 'Multi Report',
      fileType: 'JSON',
      jobs: [
        { service: 'inventory', task: 'export-systems' },
        { service: 'subscriptions', task: 'instances' },
      ],
      cronExpression: '30 8 * * 1-5',
    });

    expect(result.name).toBe('Multi Report');
    expect(result.schedule).toBe('30 8 * * 1-5');
    expect(result.payload.format).toBe('json');
    expect(result.payload.sources).toHaveLength(2);
    expect(result.payload.sources[0].application).toBe('urn:redhat:application:inventory');
    expect(result.payload.sources[0].resource).toBe('urn:redhat:application:inventory:export:systems');
    expect(result.payload.sources[1].application).toBe('subscriptions');
    expect(result.payload.sources[1].resource).toBe('instances');
  });

  it('prefers jobs array over legacy service/task when both are present', () => {
    const result = uiReportDataToApiRequest({
      reportName: 'Test',
      fileType: 'CSV',
      service: 'subscriptions',
      task: 'instances',
      jobs: [
        { service: 'inventory', task: 'export-systems' },
      ],
      cronExpression: '0 0 * * 0',
    });

    expect(result.payload.sources).toHaveLength(1);
    expect(result.payload.sources[0].application).toBe('urn:redhat:application:inventory');
  });

  it('throws when jobs array is empty', () => {
    expect(() =>
      uiReportDataToApiRequest({
        reportName: 'Test',
        fileType: 'CSV',
        jobs: [],
        cronExpression: '0 0 * * 0',
      })
    ).toThrow('At least one job with a service and task is required');
  });

  it('throws when all jobs are empty', () => {
    expect(() =>
      uiReportDataToApiRequest({
        reportName: 'Test',
        fileType: 'CSV',
        jobs: [{ service: '', task: '' }, { service: '', task: '' }],
        cronExpression: '0 0 * * 0',
      })
    ).toThrow('At least one job with a service and task is required');
  });

  it('throws when service identifier is not in metadata', () => {
    expect(() =>
      uiReportDataToApiRequest({
        reportName: 'Test',
        fileType: 'CSV',
        service: 'unknown-service',
        task: 'export-systems',
        cronExpression: '0 0 * * 0',
      })
    ).toThrow('Invalid service identifier: unknown-service');
  });

  it('throws when task identifier is not in metadata', () => {
    expect(() =>
      uiReportDataToApiRequest({
        reportName: 'Test',
        fileType: 'CSV',
        service: 'inventory',
        task: 'unknown-task',
        cronExpression: '0 0 * * 0',
      })
    ).toThrow('Invalid task identifier: unknown-task for service: inventory');
  });

  it('throws on first invalid job in multi-job array', () => {
    expect(() =>
      uiReportDataToApiRequest({
        reportName: 'Test',
        fileType: 'CSV',
        jobs: [
          { service: 'inventory', task: 'export-systems' },
          { service: 'invalid-service', task: 'some-task' },
        ],
        cronExpression: '0 0 * * 0',
      })
    ).toThrow('Invalid service identifier: invalid-service');
  });

  it('returns valid URN format for known service/task', () => {
    const result = uiReportDataToApiRequest({
      reportName: 'Test',
      fileType: 'CSV',
      service: 'inventory',
      task: 'export-systems',
      cronExpression: '0 0 * * 0',
    });

    expect(result.payload.sources[0].application).toMatch(/^urn:redhat:application:/);
    expect(result.payload.sources[0].resource).toMatch(/^urn:redhat:application:/);
  });

  it('includes timezone in request when provided', () => {
    const result = uiReportDataToApiRequest({
      reportName: 'Test',
      fileType: 'CSV',
      service: 'inventory',
      task: 'export-systems',
      cronExpression: '0 0 * * 0',
      timezone: 'Asia/Tokyo',
    });
    expect(result.timezone).toBe('Asia/Tokyo');
  });

  it('omits timezone from request when not provided', () => {
    const result = uiReportDataToApiRequest({
      reportName: 'Test',
      fileType: 'CSV',
      service: 'inventory',
      task: 'export-systems',
      cronExpression: '0 0 * * 0',
    });
    expect(result.timezone).toBeUndefined();
  });
});
