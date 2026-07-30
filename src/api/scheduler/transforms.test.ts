import { apiRunToUIHistory } from './transforms';
import type { SchedulerJobRun } from './types';

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
