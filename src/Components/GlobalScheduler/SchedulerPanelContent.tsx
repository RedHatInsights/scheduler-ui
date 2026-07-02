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
import type { ScheduledReport } from '../../hooks/useSchedulerState';
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
    isFilterNameOpen, setIsFilterNameOpen,
    isFilterOpen, setIsFilterOpen,
    page, perPage, onSetPage, onPerPageSelect,
    sortBy, onSort, REPORT_COL, STATUS_COL,
    expandedReportIds, toggleRowExpanded,
    sortedReports,
    deleteReport,
    // report history tab
    historyPage, historyPerPage, onHistorySetPage, onHistoryPerPageSelect,
    historyFilterName, setHistoryFilterName,
    historyFilterDate, setHistoryFilterDate,
    filteredHistory,
  } = useSchedulerState();

  const [reportToDelete, setReportToDelete] = useState<ScheduledReport | null>(null);
  const [alerts, setAlerts] = useState<ToastAlert[]>([]);
  const alertKeyRef = useRef(0);
  const timerIds = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timerIds.current.forEach(clearTimeout), []);

  const handleDeleteRequest = useCallback((report: ScheduledReport) => {
    setReportToDelete(report);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!reportToDelete) return;
    const { id, name } = reportToDelete;
    deleteReport(id);
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
  }, [reportToDelete, deleteReport]);

  const handleDeleteCancel = useCallback(() => {
    setReportToDelete(null);
  }, []);

  const removeAlert = useCallback((key: number) => {
    setAlerts((prev) => prev.filter((a) => a.key !== key));
  }, []);

  return (
    <Flex direction={{ default: 'column' }} className="scheduler-ui scheduler-panel-content">
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
            isFilterNameOpen={isFilterNameOpen}
            onFilterNameOpenChange={setIsFilterNameOpen}
            isFilterOpen={isFilterOpen}
            onFilterOpenChange={setIsFilterOpen}
            onCreateNew={() => wizard.open()}
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
          />
        )}
      </FlexItem>

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
        onClose={wizard.close}
        onSave={(data) => console.log('Saving report:', data)}
        initialValues={wizard.params}
      />
    </Flex>
  );
};

export default SchedulerPanelContent;
