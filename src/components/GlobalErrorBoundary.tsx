
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // You can log the error to an error reporting service
    console.error('Uncaught error:', error, errorInfo);
    this.setState({
      error,
      errorInfo
    });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = '/';
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="flex justify-center items-center min-h-screen p-4">
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle className="text-xl">אירעה שגיאה בטעינת העמוד</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/10 rounded border border-red-200 dark:border-red-800">
                <p className="text-red-700 dark:text-red-400">
                  {this.state.error?.toString() || 'שגיאה לא ידועה'}
                </p>
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                ייתכן שאירעה שגיאה בטעינת המודולים או שחלק מהקבצים לא זמינים.
              </p>
              <p className="text-sm text-muted-foreground">
                ניתן לנסות לרענן את העמוד או לחזור לדף הבית.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={this.handleReload}>
                <RefreshCw size={16} className="mr-2" />
                רענן עמוד
              </Button>
              <Button onClick={this.handleGoHome}>
                <Home size={16} className="mr-2" />
                חזור לדף הבית
              </Button>
            </CardFooter>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
