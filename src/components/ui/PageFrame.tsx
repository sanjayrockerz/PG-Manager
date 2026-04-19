import { ReactNode } from 'react';

interface PageFrameProps {
  children: ReactNode;
  className?: string;
}

export function PageFrame({ children, className = '' }: PageFrameProps) {
  return (
    <div className={`min-h-screen bg-[#F8FAFC] p-6 ${className}`}>
      <div className="mx-auto max-w-7xl space-y-6">
        {children}
      </div>
    </div>
  );
}
