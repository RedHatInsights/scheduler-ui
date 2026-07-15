/**
 * SchedulerPage — DEV HARNESS ONLY
 *
 * Production architecture
 * ───────────────────────
 * GlobalScheduler (this app) will be added to insights-chrome (the HCC shell)
 * the same way the NotificationsDrawer is — chrome mounts it via ScalprumComponent
 * using the federated module exposed at './GlobalScheduler'. Consumer apps never
 * import or open the sidebar themselves.
 *
 * Consumer apps (e.g. Cost Management, Advisor) import only the hook:
 *
 *   import useSchedulerModal from 'scheduler-ui/useSchedulerModal';
 *
 *   const wizard = useSchedulerModal();
 *   <Button onClick={() => wizard.open({ service: 'Cost Management' })}>
 *     Schedule report
 *   </Button>
 *   <ScheduleReportWizard isOpen={wizard.isOpen} onClose={wizard.close} ... />
 *
 * This page exists only to exercise GlobalScheduler and useSchedulerModal
 * locally during development — it is not part of the production integration.
 */
import React, { useCallback, useState } from 'react';
import {
  Alert,
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  PageSection,
  Title,
} from '@patternfly/react-core';
import { CalendarAltIcon } from '@patternfly/react-icons';
import GlobalScheduler from '../GlobalScheduler/GlobalScheduler';
import ScheduleReportWizard from '../ScheduleReportWizard/ScheduleReportWizard';
import SchedulerDownloadButton from '../SchedulerDownloadButton/SchedulerDownloadButton';
import { useSchedulerModal } from '../../hooks/useSchedulerModal';

const SchedulerPage: React.FC = () => {
  // Simulates how a consumer app uses the hook to open the scheduling wizard.
  const wizard = useSchedulerModal();

  // Dev-harness only: toggle the sidebar for local testing.
  // In production, chrome controls the sidebar open state.
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleDownload = useCallback(
    (_event: MouseEvent | React.MouseEvent | React.KeyboardEvent, format: 'csv' | 'json') => {
      console.log('Download format:', format);
    },
    []
  );

  const handleScheduleExport = useCallback(() => {
    wizard.open({
      service: 'Cost Management',
      reportName: 'Monthly spend report',
      fileType: 'CSV',
    });
  }, [wizard]);

  return (
    <GlobalScheduler isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)}>
      <PageSection>
        <Alert
          variant="info"
          isInline
          title="Development harness — not the final integration"
        >
          In production, <strong>GlobalScheduler</strong> is mounted by insights-chrome
          (like the NotificationsDrawer). Consumer apps only import{' '}
          <strong>useSchedulerModal</strong> to open the scheduling wizard from their
          own pages.
        </Alert>
      </PageSection>
      <PageSection>
        <Title headingLevel="h1" size="2xl">Report Scheduler</Title>
        <PageSection>
          <EmptyState
            icon={CalendarAltIcon}
            titleText="Welcome to Report Scheduler"
            headingLevel="h2"
          >
            <EmptyStateBody>
              Create and manage report schedules to receive automated reports via email.
              <br />
              Get started by configuring your first scheduled report.
            </EmptyStateBody>
            <EmptyStateActions>
              {/* Consumer pattern: open the wizard modal directly — no sidebar needed */}
              <Button
                variant="primary"
                onClick={() =>
                  wizard.open({
                    service: 'Cost Management',
                    reportName: 'Monthly spend report',
                    fileType: 'PDF',
                    task: 'Task 1',
                  })
                }
              >
                Schedule recurring report
              </Button>
              {/* SchedulerDownloadButton: drop-in DownloadButton replacement
                  with an added "Schedule export" option */}
              <SchedulerDownloadButton
                onSelect={handleDownload}
                onScheduleExport={handleScheduleExport}
              />
              {/* Dev-harness only: preview the sidebar (chrome does this in production) */}
              <Button variant="secondary" onClick={() => setIsSidebarOpen(true)}>
                Preview Global Scheduler sidebar
              </Button>
            </EmptyStateActions>
          </EmptyState>
        </PageSection>
      </PageSection>

      {/* Standalone wizard — rendered here just as a consumer app would render it */}
      <ScheduleReportWizard
        isOpen={wizard.isOpen}
        onClose={wizard.close}
        onSave={(data) => console.log('Saving report:', data)}
        initialValues={wizard.params}
      />
    </GlobalScheduler>
  );
};

export default SchedulerPage;
