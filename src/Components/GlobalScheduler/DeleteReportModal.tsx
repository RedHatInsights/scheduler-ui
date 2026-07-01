import React from 'react';
import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';

interface DeleteReportModalProps {
  isOpen: boolean;
  reportName: string;
  onClose: () => void;
  onDelete: () => void;
}

const DeleteReportModal: React.FC<DeleteReportModalProps> = ({
  isOpen,
  reportName,
  onClose,
  onDelete,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    aria-label={`Delete ${reportName}`}
    variant="small"
  >
    <ModalHeader
      title="Delete this scheduled recurring report?"
      titleIconVariant="warning"
      labelId="delete-report-modal-title"
    />
    <ModalBody>
      Are you sure you want to delete this scheduled recurring report? Once the
      report is being deleted, all of its upcoming scheduled reports will be
      deleted. The action cannot be undone.
    </ModalBody>
    <ModalFooter>
      <Button variant="danger" onClick={onDelete} data-testid="delete-confirm-button">
        Delete
      </Button>
      <Button variant="link" onClick={onClose}>
        Cancel
      </Button>
    </ModalFooter>
  </Modal>
);

export default DeleteReportModal;
