import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerContentBody,
  DrawerPanelContent,
} from '@patternfly/react-core';
import SchedulerPanelContent from './SchedulerPanelContent';
import './GlobalScheduler.css';

/**
 * Full-drawer wrapper for the standalone dev harness.
 *
 * This component renders its own `<Drawer>` with resize controls,
 * shadows, and sticky positioning — suitable for use as the top-level
 * page layout in the scheduler-ui app itself.
 *
 * For embedding inside insights-chrome (which already has a page-level
 * drawer), use `<SchedulerPanelContent>` directly to avoid nested drawers.
 */
interface GlobalSchedulerProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const GlobalScheduler: React.FC<GlobalSchedulerProps> = ({ isOpen, onClose, children }) => {
  const panelContent = (
    <DrawerPanelContent isResizable defaultSize="600px" minSize="400px" maxSize="800px" className="scheduler-ui-panel-content">
      <SchedulerPanelContent toggleDrawer={onClose} />
    </DrawerPanelContent>
  );

  return (
    <Drawer isExpanded={isOpen} className="scheduler-ui global-scheduler-drawer">
      <DrawerContent panelContent={panelContent}>
        <DrawerContentBody>{children}</DrawerContentBody>
      </DrawerContent>
    </Drawer>
  );
};

export default GlobalScheduler;
