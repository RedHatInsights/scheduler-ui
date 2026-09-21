import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SchedulerModal from './SchedulerModal';

describe('SchedulerModal', () => {
  it('renders children when open', () => {
    render(
      <SchedulerModal isOpen onClose={jest.fn()} title="My modal">
        <p>Modal body</p>
      </SchedulerModal>
    );
    expect(screen.getByText('Modal body')).toBeInTheDocument();
  });

  it('renders nothing when closed', () => {
    render(
      <SchedulerModal isOpen={false} onClose={jest.fn()} title="My modal">
        <p>Modal body</p>
      </SchedulerModal>
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Modal body')).not.toBeInTheDocument();
  });

  it('uses the title as the dialog aria-label', () => {
    render(
      <SchedulerModal isOpen onClose={jest.fn()} title="Report details">
        <p>Body</p>
      </SchedulerModal>
    );
    expect(screen.getByRole('dialog', { name: 'Report details' })).toBeInTheDocument();
  });

  it('applies the provided className', () => {
    render(
      <SchedulerModal isOpen onClose={jest.fn()} title="t" className="my-custom-modal">
        <p>Body</p>
      </SchedulerModal>
    );
    expect(screen.getByRole('dialog')).toHaveClass('my-custom-modal');
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = jest.fn();
    render(
      <SchedulerModal isOpen onClose={onClose} title="t">
        <p>Body</p>
      </SchedulerModal>
    );
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
