
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { logError } from '@/services/errors/utils/errorTracking';
import ErrorDisplay from './ErrorDisplay';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log the error
    logError({
      category: 'ui',
      action: 'component-error',
      error,
      metadata: {
        componentStack: errorInfo.componentStack
      }
    }).catch(err => {
      console.error('Failed to log error:', err);
    });
    
    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      // Default fallback UI
      return (
        <div className="p-4 border rounded-lg">
          <ErrorDisplay
            title="שגיאה לא צפויה"
            message="אירעה שגיאה לא צפויה בתצוגה. נסה לרענן את העמוד."
            variant="destructive"
          />
          <div className="flex justify-center mt-4">
            <Button onClick={this.handleReset}>נסה שוב</Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="ml-2"
            >
              רענן עמוד
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
