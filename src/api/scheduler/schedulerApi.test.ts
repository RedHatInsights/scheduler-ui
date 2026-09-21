// The real schedulerApi module is globally mocked in config/jest.setup.js so
// component/hook tests don't hit the network. Here we test the real module, so
// undo that global mock and mock the underlying client instead.
jest.unmock('./schedulerApi');

jest.mock('../client', () => ({
  schedulerClient: {
    listJobs: jest.fn(),
    getJob: jest.fn(),
    createJob: jest.fn(),
    patchJob: jest.fn(),
    deleteJob: jest.fn(),
    runJob: jest.fn(),
    pauseJob: jest.fn(),
    resumeJob: jest.fn(),
    listAllRuns: jest.fn(),
    getJobRuns: jest.fn(),
    getJobRun: jest.fn(),
  },
}));

import { schedulerClient } from '../client';
import * as api from './schedulerApi';
import type { SchedulerJob, SchedulerJobRun, CreateJobRequest, PatchJobRequest } from './types';

const client = schedulerClient as jest.Mocked<typeof schedulerClient>;

const makeJob = (o: Partial<SchedulerJob> = {}): SchedulerJob =>
  ({
    id: 'job-1',
    name: 'RHEL usage report',
    schedule: '0 0 * * 0',
    type: 'export',
    payload: {},
    status: 'scheduled',
    ...o,
  } as SchedulerJob);

const makeRun = (o: Partial<SchedulerJobRun> = {}): SchedulerJobRun =>
  ({
    id: 'run-1',
    job_id: 'job-1',
    status: 'completed',
    start_time: '2026-01-01T00:00:00Z',
    ...o,
  } as SchedulerJobRun);

beforeEach(() => jest.clearAllMocks());

describe('listJobs', () => {
  it('passes default empty params and maps data + total from meta.count', async () => {
    const jobs = [makeJob({ id: 'job-1' }), makeJob({ id: 'job-2' })];
    (client.listJobs as jest.Mock).mockResolvedValue({ data: { data: jobs, meta: { count: 2 } } });

    const result = await api.listJobs();

    expect(client.listJobs).toHaveBeenCalledWith({});
    expect(result).toEqual({ data: jobs, total: 2 });
  });

  it('forwards the given params to the client', async () => {
    (client.listJobs as jest.Mock).mockResolvedValue({ data: { data: [], meta: { count: 0 } } });
    const params = { status: 'paused', name: 'cost', offset: 10, limit: 5, sortBy: 'name:desc' } as const;

    const result = await api.listJobs(params);

    expect(client.listJobs).toHaveBeenCalledWith(params);
    expect(result).toEqual({ data: [], total: 0 });
  });
});

describe('getJob', () => {
  it('calls the client with the id and returns the entity', async () => {
    const job = makeJob({ id: 'job-9' });
    (client.getJob as jest.Mock).mockResolvedValue({ data: job });

    const result = await api.getJob('job-9');

    expect(client.getJob).toHaveBeenCalledWith({ id: 'job-9' });
    expect(result).toBe(job);
  });

  it('propagates client errors (does not swallow)', async () => {
    (client.getJob as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(api.getJob('job-9')).rejects.toThrow('boom');
  });
});

describe('createJob', () => {
  it('wraps the request as createJobRequest and returns the entity', async () => {
    const request = { name: 'r', schedule: '0 0 * * 0', type: 'export', payload: {} } as CreateJobRequest;
    const created = makeJob({ id: 'new-job' });
    (client.createJob as jest.Mock).mockResolvedValue({ data: created });

    const result = await api.createJob(request);

    expect(client.createJob).toHaveBeenCalledWith({ createJobRequest: request });
    expect(result).toBe(created);
  });
});

describe('patchJob', () => {
  it('wraps id + request and keeps a timezone field at runtime', async () => {
    const request = { name: 'renamed', timezone: 'America/New_York' } as PatchJobRequest & { timezone?: string };
    const patched = makeJob({ id: 'job-1', name: 'renamed' });
    (client.patchJob as jest.Mock).mockResolvedValue({ data: patched });

    const result = await api.patchJob('job-1', request);

    expect(client.patchJob).toHaveBeenCalledWith({ id: 'job-1', patchJobRequest: request });
    // the `as PatchJobRequest` cast only strips the type; timezone survives at runtime
    expect((client.patchJob as jest.Mock).mock.calls[0][0].patchJobRequest).toHaveProperty(
      'timezone',
      'America/New_York'
    );
    expect(result).toBe(patched);
  });
});

describe('deleteJob', () => {
  it('calls the client with the id and resolves undefined', async () => {
    (client.deleteJob as jest.Mock).mockResolvedValue(undefined);

    const result = await api.deleteJob('job-1');

    expect(client.deleteJob).toHaveBeenCalledWith({ id: 'job-1' });
    expect(result).toBeUndefined();
  });
});

describe('runJob', () => {
  it('calls the client with the id and returns the run response', async () => {
    (client.runJob as jest.Mock).mockResolvedValue({ data: { run_id: 'run-42' } });

    const result = await api.runJob('job-1');

    expect(client.runJob).toHaveBeenCalledWith({ id: 'job-1' });
    expect(result).toEqual({ run_id: 'run-42' });
  });
});

describe('pauseJob', () => {
  it('calls the client with the id and returns the entity', async () => {
    const job = makeJob({ status: 'paused' });
    (client.pauseJob as jest.Mock).mockResolvedValue({ data: job });

    const result = await api.pauseJob('job-1');

    expect(client.pauseJob).toHaveBeenCalledWith({ id: 'job-1' });
    expect(result).toBe(job);
  });
});

describe('resumeJob', () => {
  it('calls the client with the id and returns the entity', async () => {
    const job = makeJob({ status: 'scheduled' });
    (client.resumeJob as jest.Mock).mockResolvedValue({ data: job });

    const result = await api.resumeJob('job-1');

    expect(client.resumeJob).toHaveBeenCalledWith({ id: 'job-1' });
    expect(result).toBe(job);
  });
});

describe('listAllRuns', () => {
  it('calls the client with empty params and unwraps the nested data array', async () => {
    const runs = [makeRun({ id: 'run-1' }), makeRun({ id: 'run-2' })];
    (client.listAllRuns as jest.Mock).mockResolvedValue({ data: { data: runs } });

    const result = await api.listAllRuns();

    expect(client.listAllRuns).toHaveBeenCalledWith({});
    expect(result).toBe(runs);
  });
});

describe('getJobRuns', () => {
  it('calls the client with the id and unwraps the nested data array', async () => {
    const runs = [makeRun({ id: 'run-1' })];
    (client.getJobRuns as jest.Mock).mockResolvedValue({ data: { data: runs } });

    const result = await api.getJobRuns('job-1');

    expect(client.getJobRuns).toHaveBeenCalledWith({ id: 'job-1' });
    expect(result).toBe(runs);
  });
});

describe('getJobRun', () => {
  it('calls the client with id + runId and returns the entity', async () => {
    const run = makeRun({ id: 'run-7' });
    (client.getJobRun as jest.Mock).mockResolvedValue({ data: run });

    const result = await api.getJobRun('job-1', 'run-7');

    expect(client.getJobRun).toHaveBeenCalledWith({ id: 'job-1', runId: 'run-7' });
    expect(result).toBe(run);
  });
});
