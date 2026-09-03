import React from 'react';
import { Bullseye, EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { CalendarAltIcon } from '@patternfly/react-icons';
import { useOpenSchedulerDrawer } from '../../hooks/useOpenSchedulerDrawer';

/**
 * SchedulerLanding — fallback route for any path that is not the
 * /download/:jobId/:runId email-link target (including the app root).
 *
 * Rather than rendering a blank screen, it opens the global scheduler drawer via
 * chrome (best-effort, same mechanism as the DownloadPage) so the user lands on
 * their scheduled reports, and shows a short pointer beside it. Outside chrome
 * (e.g. tests) the drawer open is a silent no-op and only the empty state shows.
 */
const SchedulerLanding: React.FC = () => {
  useOpenSchedulerDrawer();

  return (
    <div className="scheduler-ui">
      <Bullseye>
        <EmptyState icon={CalendarAltIcon} titleText="Your scheduled reports" headingLevel="h1">
          <EmptyStateBody>
            Manage and create scheduled reports from the scheduler panel.
          </EmptyStateBody>
        </EmptyState>
      </Bullseye>
    </div>
  );
};

export default SchedulerLanding;
