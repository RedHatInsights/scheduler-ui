import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  AlertActionCloseButton,
  AlertGroup,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  MenuToggle,
  Tab,
  TabTitleText,
  Tabs,
  Title,
} from '@patternfly/react-core';
import { EllipsisVIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import ScheduleReportWizard from '../ScheduleReportWizard/ScheduleReportWizard';
import SchedulerReportsTable from './SchedulerReportsTable';
import DeleteReportModal from './DeleteReportModal';
import ReportHistoryTable from './ReportHistoryTable';
import { useSchedulerState } from '../../hooks/useSchedulerState';
import { useSchedulerModal } from '../../hooks/useSchedulerModal';
import type { ReportHistoryEntry, ScheduledReport } from '../../hooks/useSchedulerState';
import ReportDetailModal from './ReportDetailModal';
import type { RunInstance } from './ReportDetailModal';
import { getJobRun, getJobRuns, getJob } from '../../api/scheduler/schedulerApi';
import { findServiceIdFromApplicationURN, findTaskIdFromResourceURN } from '../../api/metadata/exportMetadata';
import './SchedulerPanelContent.css';

/**
 * Panel-only component for Chrome integration.
 *
 * Renders the scheduler header, tabs, table, and wizard WITHOUT a
 * `<Drawer>` wrapper. Chrome's drawer system already provides the
 * outer drawer and panel, so embedding this component avoids
 * drawer-inside-a-drawer nesting issues.
 *
 * For the standalone dev harness, use `<GlobalScheduler>` instead —
 * it wraps this component in its own full `<Drawer>`.
 */
interface SchedulerPanelContentProps {
  /** Called when the user clicks the close button. In Chrome, this
   *  is `toggleDrawer` passed by the ScalprumComponent host. */
  toggleDrawer?: () => void;
}

interface ToastAlert {
  key: number;
  title: string;
  description: string;
}

const SchedulerPanelContent: React.FC<SchedulerPanelContentProps> = ({ toggleDrawer }) => {
  const wizard = useSchedulerModal();

  const {
    activeTabKey, setActiveTabKey,
    isHeaderMenuOpen, setIsHeaderMenuOpen,
    filterName, setFilterName,
    filterStatus, setFilterStatus,
    isFilterStatusOpen, setIsFilterStatusOpen,
    filterService, setFilterService,
    isFilterServiceOpen, setIsFilterServiceOpen,
    page, perPage, onSetPage, onPerPageSelect,
    sortBy, onSort, REPORT_COL, STATUS_COL,
    expandedReportIds, toggleRowExpanded,
    sortedReports,
    deleteReport,
    createReport,
    updateReport,
    togglePauseReport,
    error,
    setError,
    // report history tab
    historyPage, historyPerPage, onHistorySetPage, onHistoryPerPageSelect,
    historyFilterName, setHistoryFilterName,
    historyFilterDate, setHistoryFilterDate,
    filteredHistory,
  } = useSchedulerState();

  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
  const [editingReportId, setEditingReportId] = useState<string | null>(null);
  const [detailReport, setDetailReport] = useState<ScheduledReport | null>(null);
  const [detailRuns, setDetailRuns] = useState<RunInstance[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [alerts, setAlerts] = useState<ToastAlert[]>([]);
  const alertKeyRef = useRef(0);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timerIds.current.forEach(clearTimeout), []);

  const handleEditRequest = useCallback(async (report: ScheduledReport) => {
    try {
      // Fetch full job details to get payload + schedule
      const job = await getJob(report.id);
      const payload = job.payload as { sources?: Array<{ application: string; resource: string }>; format?: string };

      // Extract service/task/format from payload
      const application = payload.sources?.[0]?.application || '';
      const resource = payload.sources?.[0]?.resource || '';
      const format = payload.format || '';

      // Lookup service ID and task ID from metadata
      const serviceId = findServiceIdFromApplicationURN(application);
      const taskId = findTaskIdFromResourceURN(resource);

      setEditingReportId(report.id);
      wizard.open({
        reportName: job.name,
        service: serviceId,
        task: taskId,
        fileType: format.toUpperCase() as 'PDF' | 'CSV' | 'JSON',
        cronExpression: job.schedule,
      });
    } catch (err) {
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: 'Failed to load report details',
          description: err instanceof Error ? err.message : 'Could not fetch job details',
        },
      ]);
      timerIds.current.push(
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
        }, 4000)
      );
    }
  }, [wizard]);

  const handleViewReport = useCallback(async (report: ScheduledReport) => {
    setDetailReport(report);
    setDetailRuns([]);
    setDetailLoading(true);
    try {
      const runs = await getJobRuns(report.id);
      setDetailRuns(
        runs.map((r) => ({
          id: r.id,
          time: r.start_time,
          status: (r.status === 'running' || r.status === 'failed') ? r.status : 'completed' as const,
        }))
      );
    } catch (err) {
      setDetailRuns([]);
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: 'Failed to load report runs',
          description: err instanceof Error ? err.message : 'Could not fetch run history',
        },
      ]);
      timerIds.current.push(
        setTimeout(() => setAlerts((prev) => prev.filter((a) => a.key !== alertKey)), 4000)
      );
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handlePauseReport = useCallback(async (report: ScheduledReport) => {
    const action = report.status === 'Paused' ? 'resumed' : 'paused';
    try {
      await togglePauseReport(report.id, report.status);
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        { key: alertKey, title: `Report ${action} successfully.`, description: `${report.name} has been ${action}.` },
      ]);
      timerIds.current.push(setTimeout(() => setAlerts((prev) => prev.filter((a) => a.key !== alertKey)), 8000));
    } catch (err) {
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        { key: alertKey, title: `Failed to ${action.slice(0, -1)} report`, description: err instanceof Error ? err.message : 'An error occurred' },
      ]);
      timerIds.current.push(setTimeout(() => setAlerts((prev) => prev.filter((a) => a.key !== alertKey)), 8000));
    }
  }, [togglePauseReport]);

  const handleDeleteRequest = useCallback((report: ScheduledReport) => {
    setReportToDelete(report);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!reportToDelete) return;
    const { id, name } = reportToDelete;

    try {
      await deleteReport(id);
      setReportToDelete(null);
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: 'Recurring report deleted successfully.',
          description: `${name} has been deleted successfully.`,
        },
      ]);
      timerIds.current.push(
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
        }, 8000)
      );
    } catch (err) {
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: 'Failed to delete report',
          description: err instanceof Error ? err.message : 'An error occurred',
        },
      ]);
      timerIds.current.push(
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
        }, 8000)
      );
    }
  }, [reportToDelete, deleteReport]);

  const handleDeleteCancel = useCallback(() => {
    setReportToDelete(null);
  }, []);

  const removeAlert = useCallback((key: number) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  }, []);

  const handleDownloadReport = useCallback(async (report: ReportHistoryEntry) => {
    try {
      const fullRun = await getJobRun(report.jobId, report.runId);

      if (!fullRun.result?.export_id) {
        const alertKey = ++alertKeyRef.current;
        setAlerts((prev) => [
          ...prev,
          {
            key: alertKey,
            title: 'Download not available',
            description: 'This report does not have an export ID.',
          },
        ]);
        timerIds.current.push(
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
          }, 4000)
        );
        return;
      }

      const url = `/api/export/v1/exports/${fullRun.result.export_id}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        const result = await resp.json();
        console.error(result);
        throw new Error('Failed to download report. Check console for more details.');
      }

      const blob = await resp.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const hiddenLink = document.createElement('a');
      hiddenLink.href = objectUrl;
      hiddenLink.download = `${report.reportName}-${report.runDate}.zip`;
      document.body.appendChild(hiddenLink);
      hiddenLink.click();
      window.URL.revokeObjectURL(objectUrl);
      hiddenLink.remove();
    } catch (err) {
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: 'Download failed',
          description: err instanceof Error ? err.message : 'Failed to fetch download URL',
        },
      ]);
      timerIds.current.push(
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
        }, 4000)
      );
    }
  }, []);

  const handleSaveReport = useCallback(async (data: { reportName: string; fileType: string; service: string; task: string; cronExpression: string }) => {
    try {
      if (editingReportId !== null) {
        // Update existing report
        await updateReport(editingReportId, data);
        setEditingReportId(null);
        wizard.close();
        const alertKey = ++alertKeyRef.current;
        setAlerts((prev) => [
          ...prev,
          {
            key: alertKey,
            title: 'Report updated successfully.',
            description: `${data.reportName} has been updated.`,
          },
        ]);
        timerIds.current.push(
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
          }, 8000)
        );
      } else {
        // Create new report
        await createReport(data);
        wizard.close();
        const alertKey = ++alertKeyRef.current;
        setAlerts((prev) => [
          ...prev,
          {
            key: alertKey,
            title: 'Report scheduled successfully.',
            description: `${data.reportName} has been scheduled.`,
          },
        ]);
        timerIds.current.push(
          setTimeout(() => {
            setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
          }, 8000)
        );
      }
    } catch (err) {
      const alertKey = ++alertKeyRef.current;
      setAlerts((prev) => [
        ...prev,
        {
          key: alertKey,
          title: editingReportId !== null ? 'Failed to update report' : 'Failed to create report',
          description: err instanceof Error ? err.message : 'An error occurred',
        },
      ]);
      timerIds.current.push(
        setTimeout(() => {
          setAlerts((prev) => prev.filter((a) => a.key !== alertKey));
        }, 8000)
      );
    }
  }, [createReport, updateReport, editingReportId, wizard]);

  return (
    <Flex direction={{ default: 'column' }} className="scheduler-ui scheduler-panel-content">
      {error && (
        <FlexItem>
          <Alert
            variant="danger"
            title="API Error"
            actionClose={<AlertActionCloseButton onClose={() => setError(null)} />}
          >
            {error}
          </Alert>
        </FlexItem>
      )}

      <FlexItem>
        <DrawerHead>
          <Title headingLevel="h2" size="xl">Global scheduler</Title>
          <DrawerActions>
            <Dropdown
              isOpen={isHeaderMenuOpen}
              onOpenChange={setIsHeaderMenuOpen}
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  variant="plain"
                  aria-label="Global scheduler menu"
                  onClick={() => setIsHeaderMenuOpen(!isHeaderMenuOpen)}
                  isExpanded={isHeaderMenuOpen}
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
            >
              <DropdownList>
                <DropdownItem key="refresh">Refresh list</DropdownItem>
                <DropdownItem key="export">Export</DropdownItem>
              </DropdownList>
            </Dropdown>
            {toggleDrawer && <DrawerCloseButton onClick={toggleDrawer} />}
          </DrawerActions>
        </DrawerHead>
      </FlexItem>

      <FlexItem className="pf-v6-u-px-lg">
        <Tabs activeKey={activeTabKey} onSelect={(_e, key) => setActiveTabKey(key)}>
          <Tab eventKey={0} title={<TabTitleText>Scheduled reports</TabTitleText>} tabContentId="scheduled-reports-tab" />
          <Tab
            eventKey={1}
            title={
              <TabTitleText>
                Reports history&nbsp;
                <OutlinedQuestionCircleIcon className="scheduler-ui-tab-help-icon pf-v6-u-ml-xs pf-v6-u-font-size-sm" aria-label="Reports history help" />
              </TabTitleText>
            }
            tabContentId="reports-history-tab"
          />
        </Tabs>
      </FlexItem>

      <FlexItem grow={{ default: 'grow' }}>
        {activeTabKey === 0 && (
          <SchedulerReportsTable
            reports={sortedReports}
            page={page}
            perPage={perPage}
            onSetPage={onSetPage}
            onPerPageSelect={onPerPageSelect}
            sortBy={sortBy}
            onSort={onSort}
            reportSortCol={REPORT_COL}
            statusSortCol={STATUS_COL}
            expandedReportIds={expandedReportIds}
            onToggleExpand={toggleRowExpanded}
            filterName={filterName}
            onFilterNameChange={setFilterName}
            filterStatus={filterStatus}
            onFilterStatusChange={setFilterStatus}
            isFilterStatusOpen={isFilterStatusOpen}
            onFilterStatusOpenChange={setIsFilterStatusOpen}
            filterService={filterService}
            onFilterServiceChange={setFilterService}
            isFilterServiceOpen={isFilterServiceOpen}
            onFilterServiceOpenChange={setIsFilterServiceOpen}
            onCreateNew={() => wizard.open()}
            onViewReport={handleViewReport}
            onEditReport={handleEditRequest}
            onPauseReport={handlePauseReport}
            onDeleteReport={handleDeleteRequest}
          />
        )}
        {activeTabKey === 1 && (
          <ReportHistoryTable
            reports={filteredHistory}
            page={historyPage}
            perPage={historyPerPage}
            onSetPage={onHistorySetPage}
            onPerPageSelect={onHistoryPerPageSelect}
            filterName={historyFilterName}
            onFilterNameChange={setHistoryFilterName}
            filterDate={historyFilterDate}
            onFilterDateChange={setHistoryFilterDate}
            onDownload={handleDownloadReport}
          />
        )}
      </FlexItem>

      <ReportDetailModal
        isOpen={detailReport !== null}
        onClose={() => setDetailReport(null)}
        reportName={detailReport?.name ?? ''}
        runs={detailRuns}
        isLoading={detailLoading}
      />

      <DeleteReportModal
        isOpen={reportToDelete !== null}
        reportName={reportToDelete?.name ?? ''}
        onClose={handleDeleteCancel}
        onDelete={handleDeleteConfirm}
      />

      <AlertGroup isToast isLiveRegion>
        {alerts.map((alert) => (
          <Alert
            key={alert.key}
            variant="success"
            title={alert.title}
            actionClose={<AlertActionCloseButton onClose={() => removeAlert(alert.key)} />}
          >
            {alert.description}
          </Alert>
        ))}
      </AlertGroup>

      <ScheduleReportWizard
        isOpen={wizard.isOpen}
        onClose={() => {
          setEditingReportId(null);
          wizard.close();
        }}
        onSave={handleSaveReport}
        initialValues={wizard.params}
      />
    </Flex>
  );
};

export default SchedulerPanelContent;
