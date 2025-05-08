
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { toast } from 'sonner';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log the error to an error reporting service
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Show toast notification
    toast.error('אירעה שגיאה בטעינת הדף. מנסה לטעון מחדש...');
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps, prevState: ErrorBoundaryState) {
    // If we have a new error, attempt to recover by reloading the module
    if (!prevState.hasError && this.state.hasError) {
      // Wait a moment before attempting recovery
      setTimeout(() => {
        this.setState({ hasError: false, error: null });
      }, 2000);
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return this.props.fallback || (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
          <h2 className="text-xl font-bold mb-2">שגיאה בטעינת הדף</h2>
          <p className="mb-4 text-muted-foreground">אנא המתן לטעינה מחדש או נסה לרענן את הדף</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: null })}
            className="px-3 py-1 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mb-2"
          >
            נסה שוב
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-3 py-1 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
          >
            רענן דף
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
