import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
  Title,
} from '@patternfly/react-core';
import {
  Table,
  TableVariant,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@patternfly/react-table';
import { CheckCircleIcon, ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';

export interface RunInstance {
  id: string;
  time: string;
  status: 'running' | 'failed' | 'completed';
}

interface ReportDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportName: string;
  runs: RunInstance[];
  isLoading: boolean;
}

const formatRunTime = (isoDate: string): string => {
  const date = new Date(isoDate);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const RunStatusIcon: React.FC<{ status: RunInstance['status'] }> = ({ status }) => {
  switch (status) {
    case 'running':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--running pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <InProgressIcon className="scheduler-ui-spin-icon" aria-hidden />
          Running
        </span>
      );
    case 'failed':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--failed pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <ExclamationCircleIcon aria-hidden />
          Failed
        </span>
      );
    case 'completed':
      return (
        <span className="scheduler-ui-status scheduler-ui-status--completed pf-v6-u-gap-sm pf-v6-u-font-size-sm">
          <CheckCircleIcon aria-hidden />
          Completed
        </span>
      );
    default:
      return null;
  }
};

const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  isOpen,
  onClose,
  reportName,
  runs,
  isLoading,
}) => (
  <Modal isOpen={isOpen} onClose={onClose} variant="medium" aria-label={reportName}>
    <ModalHeader title={reportName} />
    <ModalBody>
      <Title headingLevel="h3" size="md" className="pf-v6-u-mb-md">
        Past instances
      </Title>
      {isLoading ? (
        <Spinner aria-label="Loading past instances" />
      ) : runs.length === 0 ? (
        <EmptyState titleText="No past instances" headingLevel="h4" variant="sm">
          <EmptyStateBody>This report has not run yet.</EmptyStateBody>
        </EmptyState>
      ) : (
        <Table aria-label="Past instances" variant={TableVariant.compact} borders>
          <Thead>
            <Tr>
              <Th>Time</Th>
              <Th>Status</Th>
            </Tr>
          </Thead>
          <Tbody>
            {runs.map((run) => (
              <Tr key={run.id}>
                <Td dataLabel="Time">{formatRunTime(run.time)}</Td>
                <Td dataLabel="Status"><RunStatusIcon status={run.status} /></Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </ModalBody>
  </Modal>
);

export default ReportDetailModal;
