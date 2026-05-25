import { ReactNode } from 'react';

interface PageFrameProps {
  children: ReactNode;
  className?: string;
}

export function PageFrame({ children, className = '' }: PageFrameProps) {
  return (
    <div
      className={className}
      style={{
        padding: '20px 24px 32px',
        minHeight: '100%',
        background: '#F8FAFC',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </div>
  );
}
