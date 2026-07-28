import React from 'react';

interface StatusPillProps {
  variant: string;
  children: React.ReactNode;
}

const StatusPill: React.FC<StatusPillProps> = ({ variant, children }) => (
  <span className={`scheduler-ui-status scheduler-ui-status--${variant} pf-v6-u-font-size-sm`}>
    {children}
  </span>
);

export default StatusPill;
