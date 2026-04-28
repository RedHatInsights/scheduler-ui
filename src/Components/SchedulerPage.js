import React from 'react';
import {
  PageSection,
  Title,
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
} from '@patternfly/react-core';
import { CalendarAltIcon } from '@patternfly/react-icons';

const SchedulerPage = () => {
  return (
    <PageSection>
      <Title headingLevel="h1" size="2xl">
        Report Scheduler
      </Title>
      <PageSection>
        <EmptyState>
          <EmptyStateIcon icon={CalendarAltIcon} />
          <Title headingLevel="h2" size="lg">
            Welcome to Report Scheduler
          </Title>
          <EmptyStateBody>
            Create and manage report schedules to receive automated reports via email.
            <br />
            Get started by configuring your first scheduled report.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    </PageSection>
  );
};

export default SchedulerPage;
