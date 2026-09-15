import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
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

interface ToastAlert {
  key: number;
  variant: 'success' | 'danger' | 'warning' | 'info';
  title: string;
  description: string;
}

// Module-level dedupe: the auto-download for a given job+run link, shared across
// the unmount/remount insights-chrome does on this landing route AND React 18
// StrictMode's double effect invocation. Both spin up a fresh component instance
// (so a per-instance ref can't guard them), and both can run `load` before the
// first fetch resolves.
//
// We store the download PROMISE, not a boolean flipped after the await. Setting
// the entry synchronously — before awaiting — latches the guard in the same tick
// the download starts, so a racing second `load` sees the in-flight entry and
// awaits it instead of firing its own download. A failed download removes its
// entry so a later mount (or retry) can try again.
const autoDownloads = new Map<string, Promise<boolean>>();

/** Test-only: reset the module-level auto-download dedupe between tests. */
export function __resetDownloadGuard(): void {
  autoDownloads.clear();
}

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

  // Toast alerts (auto-dismiss after 4s), mirroring the scheduler panel's pattern.
  const [alerts, setAlerts] = useState<ToastAlert[]>([]);
  const alertKeyRef = useRef(0);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timerIds.current.forEach(clearTimeout), []);

  const removeAlert = useCallback((key: number) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  }, []);

  const pushAlert = useCallback(
    (variant: ToastAlert['variant'], title: string, description: string) => {
      const key = ++alertKeyRef.current;
      setAlerts((prev) => [...prev, { key, variant, title, description }]);
      timerIds.current.push(setTimeout(() => removeAlert(key), 4000));
    },
    [removeAlert]
  );

  // Best-effort: open the global scheduler drawer once on mount.
  useOpenSchedulerDrawer();

  const setError = useCallback((title: string, message: string, kind: ErrorKind) => {
    setErrorTitle(title);
    setErrorMessage(message);
    setErrorKind(kind);
    setPhase('error');
  }, []);

  const doDownload = useCallback(
    async (jobRun: SchedulerJobRun): Promise<boolean> => {
      const exportId = jobRun.result?.export_id;
      if (!exportId) {
        setError('Download not available', 'This report has no downloadable export.', 'generic');
        return false;
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
        pushAlert(
          'success',
          'Report download started',
          `${name || 'Your report'} is downloading. Check your browser's downloads.`
        );
        setPhase('success');
        return true;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Something went wrong while downloading your export.';
        if (getErrorStatus(err) === 404) {
          setError(
            'Export not available',
            'This export file could not be found. It may have expired or already been removed.',
            'notFound'
          );
        } else {
          setError('Download failed', message, 'download');
        }
        pushAlert('danger', 'Download failed', message);
        return false;
      }
    },
    [setError, pushAlert]
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
      // Auto-download once per link. On a remount `load` re-runs (re-fetching the
      // run to restore the UI), but the download itself must not fire again.
      const key = `${jobId}/${runId}`;
      const inFlight = autoDownloads.get(key);
      if (inFlight) {
        // Another mount already started (or finished) this download — reflect its
        // outcome instead of firing a second one.
        setPhase('downloading');
        const ok = await inFlight;
        if (ok) setPhase('success');
        else setError('Download failed', 'Something went wrong while downloading your export.', 'download');
        return;
      }
      // Latch synchronously (before awaiting) so a racing load sees this entry.
      const download = doDownload(jobRun);
      autoDownloads.set(key, download);
      const downloaded = await download;
      if (!downloaded) autoDownloads.delete(key);
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
          <EmptyState
            status="success"
            icon={CheckCircleIcon}
            titleText="Your download has started"
            headingLevel="h1"
          >
            <EmptyStateBody>
              Check your browser&apos;s downloads for your export file.
              {runInfo}
            </EmptyStateBody>
            <EmptyStateActions className="pf-v6-u-mt-md">
              <Button variant="primary" onClick={redownload}>
                Download again
              </Button>
            </EmptyStateActions>
            <EmptyStateActions className="pf-v6-u-mt-md">
              <Button variant="link" component={(props: object) => <Link {...props} to="/" />}>
                Return to homepage
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

      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.key}
            variant={alert.variant}
            title={alert.title}
            actionClose={<AlertActionCloseButton onClose={() => removeAlert(alert.key)} />}
          >
            {alert.description}
          </Alert>
        ))}
      </AlertGroup>
    </div>
  );
};

export default DownloadPage;
