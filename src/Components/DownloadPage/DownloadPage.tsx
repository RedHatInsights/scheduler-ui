import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Bullseye,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  Spinner,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useOpenSchedulerDrawer } from '../../hooks/useOpenSchedulerDrawer';
import { fetchExport, ExportDownloadError } from '../../api/export/exportApi';
import { triggerBlobDownload, filenameFromResponse } from '../../utils/download';
import { getJob, getJobRun } from '../../api/scheduler/schedulerApi';
import type { SchedulerJob, SchedulerJobRun } from '../../api/scheduler/types';
import type { ScheduledReport } from '../../hooks/useSchedulerState';
import ReportStatusBadge from '../GlobalScheduler/ReportStatusBadge';

/**
 * DownloadPage — landing page for the "your export is ready" email link
 * (/download/:jobId/:runId). The link carries a job id + run id rather than an
 * export id: the run is the generic anchor and the export id is derived from
 * `run.result.export_id` (an export-service detail). Keying on job+run keeps the
 * page expandable to other result types without changing the link format.
 *
 * On load it fetches the run (and, best-effort, the job for format), shows a
 * summary of the report, and — when the run has completed with an export —
 * automatically downloads the file with a manual fallback link.
 *
 * It also opens the global scheduler drawer via chrome so the user lands on
 * their reports. Best-effort: chrome's `drawerActions` only exists inside
 * insights-chrome with the scheduler-drawer feature flag on (insights-chrome
 * PR #3550). Outside that (tests) it is a silent no-op — no fallback panel.
 */

// JobRunStatus ('running' | 'completed' | 'failed') → the label the shared
// ReportStatusBadge understands.
const RUN_STATUS_LABEL: Record<string, ScheduledReport['status']> = {
  running: 'Running',
  completed: 'Completed',
  failed: 'Failed',
};

type Phase = 'loading' | 'pending' | 'downloading' | 'success' | 'error';
// Drives whether the error state offers a retry, and which action it retries.
type ErrorKind = 'notFound' | 'failed' | 'download' | 'generic';

/** Pull an HTTP status off either our ExportDownloadError or an axios error. */
function getErrorStatus(err: unknown): number | undefined {
  if (err instanceof ExportDownloadError) return err.status;
  if (err && typeof err === 'object') {
    const response = (err as { response?: { status?: unknown } }).response;
    if (response && typeof response.status === 'number') return response.status;
    const status = (err as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

function formatDateTime(iso?: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-US', {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

function formatDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** CSV/JSON/etc. from the job payload, if the job was fetched. */
function formatFromJob(job: SchedulerJob | null): string | undefined {
  if (!job || typeof job.payload !== 'object' || job.payload === null) return undefined;
  const format = (job.payload as Record<string, unknown>).format;
  return typeof format === 'string' ? format.toUpperCase() : undefined;
}

const DownloadPage: React.FC = () => {
  const { jobId, runId } = useParams<{ jobId: string; runId: string }>();
  const [phase, setPhase] = useState<Phase>('loading');
  const [run, setRun] = useState<SchedulerJobRun | null>(null);
  const [job, setJob] = useState<SchedulerJob | null>(null);
  const [errorTitle, setErrorTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [errorKind, setErrorKind] = useState<ErrorKind>('generic');
  // Guard against React 18 StrictMode / shell re-renders re-running the mount
  // load. Fire once ever — this is a one-shot email-link landing, not a page
  // the user navigates between while mounted.
  const startedRef = useRef(false);

  // Best-effort: open the global scheduler drawer once on mount.
  useOpenSchedulerDrawer();

  const setError = useCallback((title: string, message: string, kind: ErrorKind) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorKind(kind);
    setPhase('error');
  }, []);

  const doDownload = useCallback(
    async (jobRun: SchedulerJobRun) => {
      const exportId = jobRun.result?.export_id;
      if (!exportId) {
        setError('Download not available', 'This report has no downloadable export.', 'generic');
        return;
      }
      setPhase('downloading');
      try {
        const resp = await fetchExport(exportId);
        const blob = await resp.blob();
        const name = jobRun.job_name?.trim();
        const filename = name
          ? `${name}-${formatDateShort(jobRun.start_time)}.zip`
          : filenameFromResponse(resp, `export-${exportId}.zip`);
        triggerBlobDownload(blob, filename);
        setPhase('success');
      } catch (err) {
        if (getErrorStatus(err) === 404) {
          setError(
            'Export not available',
            'This export file could not be found. It may have expired or already been removed.',
            'notFound'
          );
        } else {
          setError(
            'Download failed',
            err instanceof Error ? err.message : 'Something went wrong while downloading your export.',
            'download'
          );
        }
      }
    },
    [setError]
  );

  const load = useCallback(async () => {
    if (!jobId || !runId) {
      setError(
        'Invalid download link',
        'This link is missing the report information needed to start your download.',
        'notFound'
      );
      return;
    }
    setPhase('loading');
    try {
      // The run is required; the job is best-effort (only used for the format).
      const [jobRun, jobResult] = await Promise.all([
        getJobRun(jobId, runId),
        getJob(jobId).catch(() => null),
      ]);
      setRun(jobRun);
      setJob(jobResult);

      if (jobRun.status === 'failed') {
        setError(
          'Export failed',
          jobRun.error_message || 'This export failed to generate. Try running the report again from the scheduler.',
          'failed'
        );
        return;
      }
      if (jobRun.status === 'running') {
        setPhase('pending');
        return;
      }
      await doDownload(jobRun);
    } catch (err) {
      if (getErrorStatus(err) === 404) {
        setError(
          'Export not available',
          'We couldn’t find this report run. The link may be invalid or the export may have expired.',
          'notFound'
        );
      } else {
        setError(
          'Something went wrong',
          err instanceof Error ? err.message : 'We couldn’t load this export. Please try again.',
          'generic'
        );
      }
    }
  }, [jobId, runId, doDownload, setError]);

  const redownload = useCallback(() => {
    if (run) void doDownload(run);
  }, [run, doDownload]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void load();
  }, [load]);

  const jobFormat = formatFromJob(job);

  const runInfo = run ? (
    <DescriptionList
      isHorizontal
      isCompact
      style={{ textAlign: 'left', marginBlockStart: 'var(--pf-t--global--spacer--md)' }}
    >
      <DescriptionListGroup>
        <DescriptionListTerm>Report</DescriptionListTerm>
        <DescriptionListDescription>{run.job_name || '—'}</DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Status</DescriptionListTerm>
        <DescriptionListDescription>
          <ReportStatusBadge status={RUN_STATUS_LABEL[run.status] ?? 'Scheduled'} />
        </DescriptionListDescription>
      </DescriptionListGroup>
      <DescriptionListGroup>
        <DescriptionListTerm>Started</DescriptionListTerm>
        <DescriptionListDescription>{formatDateTime(run.start_time)}</DescriptionListDescription>
      </DescriptionListGroup>
      {run.end_time && (
        <DescriptionListGroup>
          <DescriptionListTerm>Finished</DescriptionListTerm>
          <DescriptionListDescription>{formatDateTime(run.end_time)}</DescriptionListDescription>
        </DescriptionListGroup>
      )}
      {jobFormat && (
        <DescriptionListGroup>
          <DescriptionListTerm>Format</DescriptionListTerm>
          <DescriptionListDescription>{jobFormat}</DescriptionListDescription>
        </DescriptionListGroup>
      )}
    </DescriptionList>
  ) : null;

  const retryAction = errorKind === 'download' ? redownload : errorKind === 'generic' ? load : undefined;

  return (
    <div className="scheduler-ui">
      <Bullseye>
        {phase === 'loading' && (
          <EmptyState icon={Spinner} titleText="Loading your export…" headingLevel="h1">
            <EmptyStateBody>Fetching the details for this report.</EmptyStateBody>
          </EmptyState>
        )}

        {phase === 'pending' && (
          <EmptyState icon={Spinner} titleText="Your export is still being generated" headingLevel="h1">
            <EmptyStateBody>
              This can take a few minutes. Check again shortly.
              {runInfo}
            </EmptyStateBody>
            <EmptyStateActions>
              <Button variant="primary" onClick={() => void load()}>
                Check again
              </Button>
            </EmptyStateActions>
          </EmptyState>
        )}

        {phase === 'downloading' && (
          <EmptyState icon={Spinner} titleText="Your download is starting…" headingLevel="h1">
            <EmptyStateBody>
              Preparing your export. This should only take a moment.
              {runInfo}
            </EmptyStateBody>
            <EmptyStateActions>
              <Button variant="link" onClick={redownload}>
                Download didn&apos;t start? Click here
              </Button>
            </EmptyStateActions>
          </EmptyState>
        )}

        {phase === 'success' && (
          <EmptyState icon={CheckCircleIcon} titleText="Your download has started" headingLevel="h1">
            <EmptyStateBody>
              Check your browser&apos;s downloads for your export file.
              {runInfo}
            </EmptyStateBody>
            <EmptyStateActions>
              <Button variant="link" onClick={redownload}>
                Download again
              </Button>
            </EmptyStateActions>
          </EmptyState>
        )}

        {phase === 'error' && (
          <EmptyState icon={ExclamationCircleIcon} titleText={errorTitle} headingLevel="h1">
            <EmptyStateBody>
              {errorMessage}
              {runInfo}
            </EmptyStateBody>
            {retryAction && (
              <EmptyStateActions>
                <Button variant="primary" onClick={() => retryAction()}>
                  Try again
                </Button>
              </EmptyStateActions>
            )}
          </EmptyState>
        )}
      </Bullseye>
    </div>
  );
};

export default DownloadPage;
