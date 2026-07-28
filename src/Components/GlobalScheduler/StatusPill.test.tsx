import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusPill from './StatusPill';

describe('StatusPill', () => {
  it('renders children', () => {
    const { getByText } = render(<StatusPill variant="running">Running</StatusPill>);
    expect(getByText('Running')).toBeInTheDocument();
  });

  it('applies the variant modifier class', () => {
    render(<StatusPill variant="failed">Failed</StatusPill>);
    const pill = screen.getByText('Failed');
    expect(pill).toHaveClass('scheduler-ui-status');
    expect(pill).toHaveClass('scheduler-ui-status--failed');
    expect(pill).toHaveClass('pf-v6-u-font-size-sm');
  });

  it('does not include pf-v6-u-gap-sm utility class', () => {
    render(<StatusPill variant="completed">Completed</StatusPill>);
    expect(screen.getByText('Completed')).not.toHaveClass('pf-v6-u-gap-sm');
  });
});
