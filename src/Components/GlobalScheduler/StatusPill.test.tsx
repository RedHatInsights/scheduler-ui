import React from 'react';
import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatusPill from './StatusPill';

describe('StatusPill', () => {
  it('renders children', () => {
    const { getByText } = render(<StatusPill variant="running">Running</StatusPill>);
    expect(getByText('Running')).toBeInTheDocument();
  });

  it('applies the variant modifier class', () => {
    const { container } = render(<StatusPill variant="failed">Failed</StatusPill>);
    const span = container.querySelector('span');
    expect(span).toHaveClass('scheduler-ui-status');
    expect(span).toHaveClass('scheduler-ui-status--failed');
    expect(span).toHaveClass('pf-v6-u-font-size-sm');
  });

  it('does not include pf-v6-u-gap-sm utility class', () => {
    const { container } = render(<StatusPill variant="completed">Completed</StatusPill>);
    expect(container.querySelector('.pf-v6-u-gap-sm')).not.toBeInTheDocument();
  });
});
