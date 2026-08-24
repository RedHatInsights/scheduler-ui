import cronstrue from 'cronstrue';
import type { SchedulerJob, SchedulerJobRun, CreateJobRequest } from './types';
import type { ScheduledReport, ReportHistoryEntry, ReportData } from '../../hooks/useSchedulerState';
import { getServiceDisplayName, getTaskDisplayName, getApplicationURN, getResourceURN, findServiceIdFromApplicationURN, findTaskIdFromResourceURN } from '../metadata/exportMetadata';
import { getUserTimezone } from '../../utils/timezone';

function mapJobStatus(status?: string): 'Running' | 'Failed' | 'Completed' | 'Scheduled' | 'Paused' {
  switch (status) {
    case 'running':
      return 'Running';
    case 'failed':
      return 'Failed';
    case 'completed':
      return 'Completed';
    case 'scheduled':
      return 'Scheduled';
    case 'paused':
      return 'Paused';
    default:
      return 'Scheduled';
  }
}

/**
 * Format ISO date string to MM/DD/YYYY HH:MM AM/PM TZ format.
 */
function formatDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/**
 * Format ISO date string to YYYY-MM-DD.
 */
function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

/**
 * Convert cron expression to human-readable frequency string.
 */
function cronToFrequency(cronExpression: string): string {
  try {
    return cronstrue.toString(cronExpression);
  } catch {
    // Fallback if cron parsing fails
    return cronExpression;
  }
}

/**
 * Transform API job + latest run to UI ScheduledReport.
 */
export function apiJobToUIReport(job: SchedulerJob): ScheduledReport {
  const sources = job.payload.sources as Array<{ application: string; resource: string }> | undefined;

  const serviceNames = [...new Set((sources || []).map(s => {
    const sid = s.application ? findServiceIdFromApplicationURN(s.application) : '';
    return sid ? getServiceDisplayName(sid) : 'Unknown';
  }))];

  const firstSource = sources?.[0];
  const resourceURN = firstSource?.resource;
  const firstServiceId = firstSource?.application ? findServiceIdFromApplicationURN(firstSource.application) : '';
  const taskId = resourceURN ? findTaskIdFromResourceURN(resourceURN) : '';
  const taskName = taskId ? getTaskDisplayName(firstServiceId, taskId) : 'Unknown';

  return {
    id: job.id,
    name: job.name,
    datetime: job.last_run_at ? formatDateTime(job.last_run_at) : 'Never',
    nextDatetime: job.next_run_at ? formatDateTime(job.next_run_at) : null,
    status: mapJobStatus(job.status),
    services: serviceNames.length > 0 ? serviceNames : ['Unknown'],
    task: taskName,
    frequency: cronToFrequency(job.schedule),
    fileType: ((job.payload as Record<string, unknown>).format as string)?.toUpperCase() || 'Unknown',
    timezone: job.timezone || getUserTimezone(),
  };
}

/**
 * Transform API job run to UI ReportHistoryEntry.
 */
export function apiRunToUIHistory(
  run: SchedulerJobRun,
  jobId: string,
  jobName: string
): ReportHistoryEntry {
  const status = (run.status === 'running' || run.status === 'failed') ? run.status : 'completed';
  return {
    id: run.id,
    reportName: jobName,
    runDate: formatDate(run.start_time),
    runDateTime: run.start_time,
    jobId,
    runId: run.id,
    status,
    errorMessage: run.error_message ?? undefined,
  };
}

/**
 * Transform UI ReportData to API CreateJobRequest.
 * Payload must match Export service API format.
 * Note: Returns CreateJobRequest with timezone extension for PATCH compatibility.
 */
export function uiReportDataToApiRequest(
  data: ReportData & { cronExpression: string }
): CreateJobRequest & { timezone?: string } {
  // Support both old single-job and new multi-job format
  const jobs: Array<{ service: string; task: string }> =
    'jobs' in data && data.jobs.length > 0
      ? data.jobs
      : [{ service: 'service' in data ? data.service : '', task: 'task' in data ? data.task : '' }];

  if (jobs.length === 0 || jobs.every((j) => !j.service && !j.task)) {
    throw new Error('At least one job with a service and task is required');
  }

  const request: CreateJobRequest = {
    name: data.reportName,
    schedule: data.cronExpression,
    type: 'export',
    payload: {
      name: data.reportName,
      format: data.fileType.toLowerCase(),
      sources: jobs.map((job) => {
        const applicationURN = getApplicationURN(job.service);
        const resourceURN = getResourceURN(job.service, job.task);

        if (!applicationURN) {
          throw new Error(`Invalid service identifier: ${job.service}`);
        }
        if (!resourceURN) {
          throw new Error(`Invalid task identifier: ${job.task} for service: ${job.service}`);
        }

        return {
          application: applicationURN,
          resource: resourceURN,
        };
      }),
    },
  };

  if (data.timezone) {
    request.timezone = data.timezone;
  }

  return request;
}
