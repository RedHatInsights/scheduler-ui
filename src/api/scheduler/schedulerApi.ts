import { schedulerClient } from '../client';
import type {
  SchedulerJob,
  SchedulerJobRun,
  PaginatedJobsResponse,
  PaginatedJobRunsResponse,
  CreateJobRequest,
  PatchJobRequest,
} from './types';

/**
 * Fetch all scheduled jobs.
 */
export async function listJobs(): Promise<SchedulerJob[]> {
  const response = await schedulerClient.get<PaginatedJobsResponse>('/jobs');
  return response.data.data;
}

/**
 * Fetch a single job by ID.
 */
export async function getJob(jobId: string): Promise<SchedulerJob> {
  const response = await schedulerClient.get<SchedulerJob>(`/jobs/${jobId}`);
  return response.data;
}

/**
 * Create a new scheduled job.
 */
export async function createJob(request: CreateJobRequest): Promise<SchedulerJob> {
  const response = await schedulerClient.post<SchedulerJob>('/jobs', request);
  return response.data;
}

/**
 * Partially update an existing job.
 */
export async function patchJob(
  jobId: string,
  request: PatchJobRequest
): Promise<SchedulerJob> {
  const response = await schedulerClient.patch<SchedulerJob>(`/jobs/${jobId}`, request);
  return response.data;
}

/**
 * Delete a job.
 */
export async function deleteJob(jobId: string): Promise<void> {
  await schedulerClient.delete(`/jobs/${jobId}`);
}

/**
 * Manually trigger a job execution.
 */
export async function runJob(jobId: string): Promise<{ run_id: string }> {
  const response = await schedulerClient.post<{ run_id: string }>(`/jobs/${jobId}/run`);
  return response.data;
}

/**
 * Pause a scheduled job.
 */
export async function pauseJob(jobId: string): Promise<SchedulerJob> {
  const response = await schedulerClient.post<SchedulerJob>(`/jobs/${jobId}/pause`);
  return response.data;
}

/**
 * Resume a paused job.
 */
export async function resumeJob(jobId: string): Promise<SchedulerJob> {
  const response = await schedulerClient.post<SchedulerJob>(`/jobs/${jobId}/resume`);
  return response.data;
}

/**
 * Fetch all job runs across all jobs for the authenticated user.
 */
export async function listAllRuns(): Promise<SchedulerJobRun[]> {
  const response = await schedulerClient.get<PaginatedJobRunsResponse>('/runs');
  return response.data.data;
}

/**
 * Fetch execution history for a specific job.
 */
export async function getJobRuns(jobId: string): Promise<SchedulerJobRun[]> {
  const response = await schedulerClient.get<PaginatedJobRunsResponse>(`/jobs/${jobId}/runs`);
  return response.data.data;
}

/**
 * Fetch a specific job run by ID.
 */
export async function getJobRun(jobId: string, runId: string): Promise<SchedulerJobRun> {
  const response = await schedulerClient.get<SchedulerJobRun>(`/jobs/${jobId}/runs/${runId}`);
  return response.data;
}
