
import React from 'react';
import { cn } from '@/lib/utils';

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Spinner = ({ size = 'md', className, ...props }: SpinnerProps) => {
  const sizeClasses = {
    'xs': 'h-3 w-3 border-[1.5px]',
    'sm': 'h-4 w-4 border-2',
    'md': 'h-6 w-6 border-2',
    'lg': 'h-8 w-8 border-[3px]',
    'xl': 'h-10 w-10 border-4',
  };

  return (
    <div 
      className={cn(
        'animate-spin rounded-full border-solid border-t-transparent',
        sizeClasses[size],
        'border-current opacity-75',
        className
      )}
      {...props}
    >
      <span className="sr-only">טוען...</span>
    </div>
  );
};

interface LoadingPageProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingPage = ({ message = 'טוען...', size = 'md' }: LoadingPageProps) => {
  const spinnerSize = {
    'sm': 'md',
    'md': 'lg',
    'lg': 'xl',
  } as const;

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-4 p-6">
      <Spinner size={spinnerSize[size]} />
      {message && (
        <p className="text-center text-muted-foreground">{message}</p>
      )}
    </div>
  );
};
