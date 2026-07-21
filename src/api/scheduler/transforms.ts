import cronstrue from 'cronstrue';
import type { SchedulerJob, SchedulerJobRun, CreateJobRequest } from './types';
import type { ScheduledReport, ReportHistoryEntry, ReportData } from '../../hooks/useSchedulerState';
import { getServiceDisplayName, getApplicationURN, getResourceURN, findServiceIdFromApplicationURN } from '../metadata/exportMetadata';

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
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;

  return `${month}/${day}/${year} ${displayHours}:${minutes} ${ampm} EST`;
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
  const sources = job.payload.sources as Array<{ application: string }> | undefined;
  const applicationURN = sources?.[0]?.application;
  const serviceId = applicationURN ? findServiceIdFromApplicationURN(applicationURN) : '';
  const serviceName = serviceId ? getServiceDisplayName(serviceId) : 'Unknown';

  return {
    id: job.id,
    name: job.name,
    datetime: job.last_run_at ? formatDateTime(job.last_run_at) : 'Never',
    status: mapJobStatus(job.status),
    services: [serviceName],
    taskCreator: 'System',
    frequency: cronToFrequency(job.schedule),
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
    jobId,
    runId: run.id,
    status,
    errorMessage: run.error_message ?? undefined,
  };
}

/**
 * Transform UI ReportData to API CreateJobRequest.
 * Payload must match Export service API format.
 */
export function uiReportDataToApiRequest(
  data: ReportData & { cronExpression: string }
): CreateJobRequest {
  return {
    name: data.reportName,
    schedule: data.cronExpression,
    type: 'export',
    payload: {
      name: data.reportName,
      format: data.fileType.toLowerCase(),
      sources: [{
        application: getApplicationURN(data.service),
        resource: getResourceURN(data.service, data.task),
      }],
    },
  };
}
