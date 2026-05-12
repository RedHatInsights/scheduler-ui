import React from 'react';
import { Modal } from '@patternfly/react-core';

interface SchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  variant?: 'small' | 'medium' | 'large' | 'default';
  className?: string;
}

const SchedulerModal: React.FC<SchedulerModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  variant = 'small',
  className,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      variant={variant}
      className={className}
    >
      {children}
    </Modal>
  );
};

export default SchedulerModal;
