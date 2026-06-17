import { ReactNode } from 'react';

interface PageFrameProps {
  children: ReactNode;
  className?: string;
}

export function PageFrame({ children, className = '' }: PageFrameProps) {
  return (
    <div className={`ds-page-frame ${className}`}>
      {children}
    </div>
  );
}
