import { schedulerClient } from '../client';
import type {
  SchedulerJob,
  SchedulerJobRun,
  CreateJobRequest,
  PatchJobRequest,
  RunJobResponse,
} from './types';

export async function listJobs(): Promise<SchedulerJob[]> {
  const response = await schedulerClient.listJobs({});
  return response.data.data;
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
  request: PatchJobRequest
): Promise<SchedulerJob> {
  const response = await schedulerClient.patchJob({ id: jobId, patchJobRequest: request });
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
