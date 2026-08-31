import { schedulerClient } from '../client';
import type {
  SchedulerJob,
  SchedulerJobRun,
  CreateJobRequest,
  PatchJobRequest,
  RunJobResponse,
  JobStatus,
} from './types';

/** Fields the API can sort jobs by. */
export type SortField = 'name' | 'status' | 'created_at' | 'next_run_at' | 'last_run_at';
/** Sort directions the API accepts. */
export type SortDirection = 'asc' | 'desc';
/** A `field:direction` sort expression, e.g. `name:desc`. */
export type ListJobsSortBy = `${SortField}:${SortDirection}`;

export interface ListJobsParams {
  status?: JobStatus;
  name?: string;
  offset?: number;
  limit?: number;
  /**
   * Sort jobs by a field, in the form 'field:direction'. Direction defaults to
   * 'asc'. Allowed fields: name, status, created_at, next_run_at, last_run_at.
   * When omitted, the API defaults to 'created_at:desc'.
   */
  sortBy?: ListJobsSortBy;
}

export interface ListJobsResult {
  data: SchedulerJob[];
  /** Total number of jobs across all pages (from the API `meta.count`). */
  total: number;
}

export async function listJobs(params: ListJobsParams = {}): Promise<ListJobsResult> {
  const response = await schedulerClient.listJobs(params);
  return { data: response.data.data, total: response.data.meta.count };
}

export async function getJob(jobId: string): Promise<SchedulerJob> {
  const response = await schedulerClient.getJob({ id: jobId });
  return response.data;
}

export async function createJob(request: CreateJobRequest): Promise<SchedulerJob> {
  const response = await schedulerClient.createJob({ createJobRequest: request });
  return response.data;
}

export async function patchJob(
  jobId: string,
  request: PatchJobRequest & { timezone?: string }
): Promise<SchedulerJob> {
  const response = await schedulerClient.patchJob({ id: jobId, patchJobRequest: request as PatchJobRequest });
  return response.data;
}

export async function deleteJob(jobId: string): Promise<void> {
  await schedulerClient.deleteJob({ id: jobId });
}

export async function runJob(jobId: string): Promise<RunJobResponse> {
  const response = await schedulerClient.runJob({ id: jobId });
  return response.data;
}

export async function pauseJob(jobId: string): Promise<SchedulerJob> {
  const response = await schedulerClient.pauseJob({ id: jobId });
  return response.data;
}

export async function resumeJob(jobId: string): Promise<SchedulerJob> {
  const response = await schedulerClient.resumeJob({ id: jobId });
  return response.data;
}

export async function listAllRuns(): Promise<SchedulerJobRun[]> {
  const response = await schedulerClient.listAllRuns({});
  return response.data.data;
}

export async function getJobRuns(jobId: string): Promise<SchedulerJobRun[]> {
  const response = await schedulerClient.getJobRuns({ id: jobId });
  return response.data.data;
}

export async function getJobRun(jobId: string, runId: string): Promise<SchedulerJobRun> {
  const response = await schedulerClient.getJobRun({ id: jobId, runId });
  return response.data;
}
