import React from 'react';
import {
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  Tab,
  TabTitleText,
  Tabs,
  Title,
} from '@patternfly/react-core';
import { EllipsisVIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import ScheduleReportWizard from '../ScheduleReportWizard/ScheduleReportWizard';
import SchedulerReportsTable from './SchedulerReportsTable';
import { useSchedulerState } from '../../hooks/useSchedulerState';
import { useSchedulerModal } from '../../hooks/useSchedulerModal';
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
  } = useSchedulerState();

  return (
    <div className="scheduler-ui scheduler-panel-content">
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

      <div className="tabs-container">
        <Tabs activeKey={activeTabKey} onSelect={(_e, key) => setActiveTabKey(key)}>
          <Tab eventKey={0} title={<TabTitleText>Scheduled reports</TabTitleText>} tabContentId="scheduled-reports-tab" />
          <Tab
            eventKey={1}
            title={
              <TabTitleText>
                Reports history&nbsp;
                <OutlinedQuestionCircleIcon className="scheduler-ui-tab-help-icon" aria-label="Reports history help" />
              </TabTitleText>
            }
            tabContentId="reports-history-tab"
          />
        </Tabs>
      </div>

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
      />

      <ScheduleReportWizard
        isOpen={wizard.isOpen}
        onClose={wizard.close}
        onSave={(data) => console.log('Saving report:', data)}
        initialValues={wizard.params}
      />
    </div>
  );
};

export default SchedulerPanelContent;
