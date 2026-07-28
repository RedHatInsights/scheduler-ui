import { apiJobToUIReport } from './transforms';
import type { SchedulerJob } from './types';

jest.mock('cronstrue', () => ({
  toString: (cron: string) => `every ${cron}`,
}));

jest.mock('../metadata/exportMetadata', () => {
  const metadata = [
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

  return {
    getServiceDisplayName: (serviceId: string) => {
      const svc = metadata.find((s) => s.id === serviceId);
      return svc?.displayName || serviceId;
    },
    getTaskDisplayName: (serviceId: string, taskId: string) => {
      const svc = metadata.find((s) => s.id === serviceId);
      const res = svc?.resources.find((r: { id: string }) => r.id === taskId);
      return res?.displayName || taskId;
    },
    findServiceIdFromApplicationURN: (urn: string) => {
      const svc = metadata.find((s) => s.application === urn);
      return svc?.id || '';
    },
    findTaskIdFromResourceURN: (urn: string) => {
      for (const svc of metadata) {
        const res = svc.resources.find((r: { resource: string }) => r.resource === urn);
        if (res) return res.id;
      }
      return '';
    },
    getApplicationURN: (serviceId: string) => {
      const svc = metadata.find((s) => s.id === serviceId);
      return svc?.application || '';
    },
    getResourceURN: (serviceId: string, taskId: string) => {
      const svc = metadata.find((s) => s.id === serviceId);
      const res = svc?.resources.find((r: { id: string }) => r.id === taskId);
      return res?.resource || '';
    },
  };
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
