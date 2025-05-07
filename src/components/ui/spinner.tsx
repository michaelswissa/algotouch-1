
import React from 'react';
import { cn } from '@/lib/utils';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ className, size = 'md', ...props }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  };
  
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-t-primary border-solid border-background/20',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  );
}

export function LoadingPage({ message = 'טוען...' }: { message?: string }) {
  return (
    <div className="flex flex-col justify-center items-center min-h-screen gap-4">
      <Spinner size="lg" />
      {message && <p className="text-muted-foreground">{message}</p>}
    </div>
  );
}
