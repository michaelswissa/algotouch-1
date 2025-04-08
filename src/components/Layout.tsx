
import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';
import { useEnhancedSubscription } from '@/contexts/subscription/EnhancedSubscriptionContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
  hideSidebar?: boolean;
}

const Layout = ({ children, className, hideSidebar = false }: LayoutProps) => {
  const { status, redirectToFix } = useEnhancedSubscription();
  
  // Show grace period alert if applicable
  const showGracePeriodAlert = status?.isGracePeriod && status.gracePeriodDays && status.gracePeriodDays > 0;
  
  useEffect(() => {
    // Add dark class to html element
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Top navigation bar will go here */}
      
      {/* Grace Period Warning Alert */}
      {showGracePeriodAlert && (
        <Alert variant="warning" className="mb-0 rounded-none border-t-0 border-b">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>
              תקופת חסד: נותרו {status.gracePeriodDays} ימים עד לחסימת הגישה. נא לעדכן פרטי תשלום.
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={redirectToFix}
            >
              עדכן עכשיו
            </Button>
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex flex-1">
        {!hideSidebar && <Sidebar />}
        <main className={cn("flex-1", className)}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
