import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeleteReportModal from './DeleteReportModal';

const DEFAULT_PROPS = {
  isOpen: true,
  reportName: 'RHEL usage report',
  onClose: jest.fn(),
  onDelete: jest.fn(),
};

describe('DeleteReportModal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the modal title', () => {
    render(<DeleteReportModal {...DEFAULT_PROPS} />);
    expect(
      screen.getByText('Delete this scheduled recurring report?')
    ).toBeInTheDocument();
  });

  it('renders the warning body text with report name', () => {
    render(<DeleteReportModal {...DEFAULT_PROPS} />);
    expect(
      screen.getByText(/RHEL usage report/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/all of its upcoming scheduled reports will be deleted/i)
    ).toBeInTheDocument();
  });

  it('renders Delete and Cancel buttons', () => {
    render(<DeleteReportModal {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('delete-confirm-button')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onDelete when the Delete button is clicked', () => {
    render(<DeleteReportModal {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByTestId('delete-confirm-button'));
    expect(DEFAULT_PROPS.onDelete).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<DeleteReportModal {...DEFAULT_PROPS} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(DEFAULT_PROPS.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not render when isOpen is false', () => {
    render(<DeleteReportModal {...DEFAULT_PROPS} isOpen={false} />);
    expect(
      screen.queryByText('Delete this scheduled recurring report?')
    ).not.toBeInTheDocument();
  });
});
