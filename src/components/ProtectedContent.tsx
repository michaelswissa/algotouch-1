
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useEnhancedSubscription } from '@/contexts/subscription/EnhancedSubscriptionContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle } from 'lucide-react';

interface ProtectedContentProps {
  children: React.ReactNode;
  requireSubscription?: boolean;
}

const ProtectedContent: React.FC<ProtectedContentProps> = ({ 
  children, 
  requireSubscription = true 
}) => {
  const { isAuthenticated, loading } = useAuth();
  const { status, isChecking, redirectToFix } = useEnhancedSubscription();
  const location = useLocation();

  // Loading state while checking auth or subscription
  if (loading || isChecking) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
        <Spinner size="lg" />
        <p className="mt-4 text-muted-foreground">טוען...</p>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // If subscription check is not required, show content
  if (!requireSubscription) {
    return <>{children}</>;
  }

  // If subscription is active, show content
  if (status?.isActive) {
    return <>{children}</>;
  }
  
  // Show appropriate error and action based on subscription status
  return (
    <div className="p-6 max-w-xl mx-auto" dir="rtl">
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>שגיאת גישה</AlertTitle>
        <AlertDescription>
          {status?.errorMessage || 'אין לך גישה לתוכן זה. נדרש מנוי פעיל.'}
          
          {status?.gracePeriodDays && (
            <p className="mt-2">
              תקופת חסד: {status.gracePeriodDays} ימים נותרו עד לחסימת הגישה.
            </p>
          )}
        </AlertDescription>
      </Alert>
      
      <div className="flex flex-col items-center gap-4">
        <Button onClick={redirectToFix} variant="default">
          {status?.requiresPaymentUpdate 
            ? 'עדכן פרטי תשלום' 
            : status?.hasCompletedRegistration
              ? 'חדש את המנוי'
              : 'השלם את ההרשמה'}
        </Button>
        
        <p className="text-sm text-muted-foreground text-center">
          לשאלות או בעיות בתהליך החיוב, אנא צור קשר עם התמיכה.
        </p>
      </div>
    </div>
  );
};

export default ProtectedContent;
