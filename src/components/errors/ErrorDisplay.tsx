
import React from 'react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle, XCircle } from 'lucide-react';

interface ErrorDisplayProps {
  title?: string;
  message: string;
  code?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'default' | 'destructive' | 'outline';
  showIcon?: boolean;
  className?: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = 'שגיאה',
  message,
  code,
  onRetry,
  onDismiss,
  variant = 'destructive',
  showIcon = true,
  className
}) => {
  return (
    <Alert variant={variant} className={`mb-4 ${className || ''}`}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          {showIcon && (
            <AlertCircle className="h-4 w-4 mr-2" />
          )}
          <AlertTitle className="mb-2 flex items-center gap-2">
            {title}
            {code && <span className="text-xs bg-muted p-1 rounded">{code}</span>}
          </AlertTitle>
          <AlertDescription className="text-sm">
            {message}
          </AlertDescription>
        </div>
        
        <div className="flex gap-2 mt-1 ml-2">
          {onRetry && (
            <Button size="sm" variant="outline" onClick={onRetry}>
              <RefreshCw className="h-3 w-3 mr-1" />
              נסה שוב
            </Button>
          )}
          
          {onDismiss && (
            <Button size="sm" variant="ghost" onClick={onDismiss}>
              <XCircle className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
};

export default ErrorDisplay;
