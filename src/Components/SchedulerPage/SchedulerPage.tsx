/**
 * SchedulerPage — DEV HARNESS ONLY
 *
 * This page exists solely to render GlobalScheduler in isolation during
 * development. It is NOT the intended delivery mechanism for the component.
 *
 * Planned production usage:
 *   GlobalScheduler will be exposed as its own federated module in fec.config.js:
 *
 *     exposes: {
 *       './RootApp':        './src/AppEntry',
 *       './GlobalScheduler': './src/Components/GlobalScheduler/GlobalScheduler',
 *     }
 *
 *   Consumer micro-frontends (e.g. Cost Management, Advisor) will then lazy-import
 *   the drawer directly, without loading the full scheduler-ui app:
 *
 *     const GlobalScheduler = React.lazy(() => import('scheduler-ui/GlobalScheduler'));
 */
import React from 'react';
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
import { useSchedulerModal } from '../../hooks/useSchedulerModal';

const SchedulerPage: React.FC = () => {
  // Use useSchedulerModal exactly as a consumer app would.
  const scheduler = useSchedulerModal();

  return (
    <GlobalScheduler
      isOpen={scheduler.isOpen}
      onClose={scheduler.close}
      initialParams={scheduler.params}
    >
      <PageSection>
        <Alert
          variant="info"
          isInline
          title="Development harness — not the final integration"
        >
          This page is used to test <strong>useSchedulerModal</strong> and{' '}
          <strong>GlobalScheduler</strong> together. Later the <strong>GlobalScheduler</strong> component would be called directly in RedHat Console by clicking the Scheduler in the options menu.
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
              {/* Plain open — no pre-fill */}
              <Button variant="primary" onClick={() => scheduler.open()}>
                Schedule recurring report
              </Button>
              {/* Demo: open with pre-filled params (simulates a consumer app passing context) */}
              <Button
                variant="secondary"
                onClick={() =>
                  scheduler.open({
                    service: 'Cost Management',
                    reportName: 'Monthly spend report',
                    fileType: 'PDF',
                    task: 'Task 1',
                  })
                }
              >
                Schedule (pre-filled demo using useSchedulerModal hook)
              </Button>
            </EmptyStateActions>
          </EmptyState>
        </PageSection>
      </PageSection>
    </GlobalScheduler>
  );
};

export default SchedulerPage;
