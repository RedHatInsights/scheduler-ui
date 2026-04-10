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
            Schedule reports to be delivered to your email regularly.
            <br />
            This is a minimal setup - start building your scheduling interface here.
          </EmptyStateBody>
        </EmptyState>
      </PageSection>
    </PageSection>
  );
};

export default SchedulerPage;
