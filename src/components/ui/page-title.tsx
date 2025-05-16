
import React from 'react';

interface PageTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function PageTitle({ children, className = '' }: PageTitleProps) {
  return (
    <h1 className={`text-3xl font-bold tracking-tight mb-6 ${className}`}>
      {children}
    </h1>
  );
}
