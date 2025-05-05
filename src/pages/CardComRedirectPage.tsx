import React, { useEffect, useState } from 'react';
import { Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { Spinner } from '@/components/ui/spinner';
import { CardComService } from '@/services/payment/CardComService';
import { supabase } from '@/integrations/supabase/client';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { StorageService } from '@/services/storage/StorageService';
import { toast } from 'sonner';
import Layout from '@/components/Layout';

/**
 * Handles redirects from CardCom payment system
 */
const CardComRedirectPage: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const [redirectPath, setRedirectPath] = useState<string | null>(null);
  
  useEffect(() => {
    const processPaymentRedirect = async () => {
      try {
        // Parse URL params to extract payment status information
        const redirectParams = CardComService.handleRedirectParameters(searchParams);
        
        PaymentLogger.log('Processing payment redirect', redirectParams);
        
        // No session ID means we can't process this properly
        if (!redirectParams.sessionId) {
          throw new Error('חסר מזהה עסקה בהפניה');
        }
        
        // Check payment status from our database
        const { data, error } = await supabase.functions.invoke('cardcom-status', {
          body: { 
            sessionId: redirectParams.sessionId,
            forceUpdate: true
          }
        });
        
        if (error) {
          throw new Error(`שגיאה בבדיקת סטטוס התשלום: ${error.message}`);
        }
        
        // Handle success state
        if (redirectParams.status === 'success' || data?.data?.status === 'success') {
          PaymentLogger.log('Payment successful, processing registration');
          
          // Get registration data if available
          const registrationData = StorageService.getRegistrationData();
          
          // Create user account if not already created
          if (registrationData && !registrationData.userCreated) {
            try {
              // Import the service dynamically to avoid circular dependencies
              const { RegistrationService } = await import('@/services/registration/RegistrationService');
              
              // Create the user account
              const accountResult = await RegistrationService.createUserAccount(registrationData);
              
              if (!accountResult.success) {
                PaymentLogger.error('Failed to create user account after payment', accountResult.error);
                toast.error('התשלום הצליח, אך לא הצלחנו ליצור את חשבון המשתמש באופן אוטומטי');
              } else {
                PaymentLogger.log('User account created successfully', { userId: accountResult.user?.id });
              }
            } catch (accountError) {
              PaymentLogger.error('Error creating user account', accountError);
              toast.error('אירעה שגיאה ביצירת חשבון המשתמש');
            }
          }
          
          // Determine where to redirect based on authentication status
          if (isAuthenticated) {
            setRedirectPath('/subscription/success' + location.search);
          } else {
            // If not authenticated, we'll redirect to auth and then to success
            setRedirectPath('/auth?redirect=/subscription/success' + location.search);
          }
        } else if (redirectParams.status === 'failed' || data?.data?.status === 'failed') {
          // Handle failure state
          PaymentLogger.log('Payment failed', redirectParams);
          setRedirectPath('/subscription/failed' + location.search);
        } else {
          // Handle unknown status
          PaymentLogger.warn('Unknown payment status in redirect', {
            redirectStatus: redirectParams.status,
            apiStatus: data?.data?.status
          });
          setRedirectPath('/subscription');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה בעיבוד התשלום';
        PaymentLogger.error('Error processing payment redirect', error);
        setError(errorMessage);
      } finally {
        setIsProcessing(false);
      }
    };
    
    if (searchParams.size > 0) {
      processPaymentRedirect();
    } else {
      // No search params means we shouldn't be on this page
      setRedirectPath('/subscription');
      setIsProcessing(false);
    }
  }, [searchParams, isAuthenticated, location.search]);
  
  // Show loading state while processing
  if (isProcessing) {
    return (
      <Layout hideSidebar>
        <div className="flex min-h-[80vh] items-center justify-center p-4">
          <div className="text-center space-y-4">
            <Spinner className="h-8 w-8 mx-auto" />
            <p className="text-lg">מעבד את פרטי התשלום...</p>
          </div>
        </div>
      </Layout>
    );
  }
  
  // If we have an error, show it
  if (error) {
    return (
      <Layout hideSidebar>
        <div className="flex min-h-[80vh] items-center justify-center p-4">
          <div className="text-center space-y-4 max-w-md bg-red-50 dark:bg-red-900/20 p-6 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-red-600 dark:text-red-400 text-xl font-medium">שגיאה בעיבוד התשלום</div>
            <p className="text-red-700 dark:text-red-300">{error}</p>
            <button 
              className="px-4 py-2 bg-primary text-primary-foreground rounded mt-4"
              onClick={() => setRedirectPath('/subscription')}
            >
              חזרה למסך התשלום
            </button>
          </div>
        </div>
      </Layout>
    );
  }
  
  // Otherwise redirect to the determined path
  if (redirectPath) {
    return <Navigate to={redirectPath} replace />;
  }
  
  // Fallback return
  return <Navigate to="/subscription" replace />;
};

export default CardComRedirectPage;
