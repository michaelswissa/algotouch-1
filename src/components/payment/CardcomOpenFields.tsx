
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, ExternalLink } from 'lucide-react';

interface CardcomOpenFieldsProps {
  planId: string;
  onPaymentComplete?: (transactionId: string) => void;
  onError?: (error: string) => void;
  onPaymentStart?: () => void;
  onCancel?: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel
}) => {
  const { user } = useAuth();
  const { fullName, email: contextEmail } = useSubscriptionContext();

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  
  // Get plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Get user email from various sources
  useEffect(() => {
    const loadUserData = async () => {
      try {
        // Check sources in order of priority
        if (contextEmail) {
          setEmail(contextEmail);
        } else if (user?.email) {
          setEmail(user.email);
        } else {
          // Try registration data
          const storedData = sessionStorage.getItem('registration_data');
          if (storedData) {
            const parsedData = JSON.parse(storedData);
            setRegistrationData(parsedData);
            
            if (parsedData?.email) {
              setEmail(parsedData.email);
            } else if (parsedData?.userData?.email) {
              setEmail(parsedData.userData.email);
            }
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      }
    };
    
    loadUserData();
  }, [user, contextEmail]);

  // Initialize payment with Cardcom
  useEffect(() => {
    const initializePayment = async () => {
      if (!email) return;
      
      try {
        setStatus('loading');
        console.log('Initializing payment with email:', email);
        
        // Get plan amount
        const amount = plan.price;
        
        // Prepare user data
        const userData = {
          planId,
          planName: plan.name,
          amount,
          userId: user?.id,
          userName: fullName || '',
          email,
          userEmail: email,
          isRecurring: planId !== 'vip',
          freeTrialDays: plan.freeTrialDays || 0,
          registrationData
        };
        
        // Call the edge function with retry logic
        let attempts = 0;
        const maxAttempts = 2;
        let success = false;
        
        while (attempts < maxAttempts && !success) {
          try {
            // Call our backend to initialize the payment
            const { data, error: apiError } = await supabase.functions.invoke('cardcom-openfields', {
              body: userData
            });
            
            if (apiError) {
              console.error('Edge function error:', apiError);
              throw new Error(`Error initializing payment: ${apiError.message}`);
            }
            
            if (!data || !data.success) {
              console.error('Payment initialization failed:', data);
              throw new Error(data?.error || 'Failed to initialize payment');
            }
            
            // Store the session ID for reference
            localStorage.setItem('payment_pending_id', data.lowProfileId);
            localStorage.setItem('payment_pending_plan', planId);
            localStorage.setItem('payment_session_created', new Date().toISOString());
            
            // Store URL for redirect
            setPaymentUrl(data.url);
            setLowProfileId(data.lowProfileId);
            setStatus('ready');
            success = true;
            
            console.log('Payment session initialized:', {
              lowProfileId: data.lowProfileId,
              url: data.url
            });
          } catch (error) {
            attempts++;
            console.error(`Payment initialization attempt ${attempts} error:`, error);
            
            if (attempts >= maxAttempts) {
              setStatus('error');
              setError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
              
              if (onError) {
                onError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
              }
            } else {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
      } catch (error) {
        console.error('Payment initialization error:', error);
        setStatus('error');
        setError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
        
        if (onError) {
          onError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
        }
      }
    };
    
    initializePayment();
  }, [email, plan, planId, user?.id, fullName, registrationData, onError]);
  
  // Handle redirect to payment page
  const handleRedirectToPayment = () => {
    if (!paymentUrl) {
      setError('לא ניתן לאתחל את דף התשלום, נא לנסות שוב');
      return;
    }
    
    setProcessing(true);
    
    if (onPaymentStart) {
      onPaymentStart();
    }
    
    // Redirect to Cardcom payment page
    window.location.href = paymentUrl;
  };

  // Show loading state
  if (status === 'loading') {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="h-8 w-8 border-4 border-t-primary animate-spin rounded-full mr-2"></div>
        <span>טוען נתוני תשלום...</span>
      </div>
    );
  }

  // If there's no email available, show error state
  if (!email) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          לא נמצאה כתובת אימייל עבור התשלום. אנא וודא שהנך מחובר למערכת או השלם את תהליך ההרשמה.
        </AlertDescription>
        <div className="mt-4">
          <Button 
            variant="outline" 
            onClick={onCancel} 
          >
            חזור
          </Button>
        </div>
      </Alert>
    );
  }

  // Error state
  if (error || status === 'error') {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {error || 'אירעה שגיאה בטעינת טופס התשלום'}
        </AlertDescription>
        <div className="flex justify-center gap-2 mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            חזור
          </Button>
          <Button 
            type="button" 
            variant="default"
            onClick={() => window.location.reload()}
          >
            נסה שוב
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      {/* Payment summary */}
      <div className="py-4 border-t border-gray-200 mt-4">
        <div className="flex justify-between">
          <span className="font-semibold">סך הכל לתשלום:</span>
          <span className="font-bold">{plan.price} ₪</span>
        </div>
        {planId !== 'vip' && plan.hasTrial && (plan.freeTrialDays || 0) > 0 && (
          <div className="text-sm text-green-600 mt-2">
            * החיוב הראשון יהיה לאחר {plan.freeTrialDays} ימי ניסיון בחינם
          </div>
        )}
      </div>
      
      {/* Email confirmation */}
      <div className="py-2">
        <p className="text-sm text-gray-600">
          אימייל לקבלת אישור תשלום:{" "}
          <span className="font-medium">{email}</span>
        </p>
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
        >
          ביטול
        </Button>
        
        <Button
          type="button"
          onClick={handleRedirectToPayment}
          disabled={!paymentUrl || processing}
          className="sm:mr-2"
        >
          {processing ? (
            <>
              <span className="h-5 w-5 border-2 border-t-background animate-spin rounded-full mr-2"></span>
              מעבר לדף תשלום...
            </>
          ) : planId !== 'vip' && plan.hasTrial && (plan.freeTrialDays || 0) > 0 ? (
            <>
              <ExternalLink className="h-4 w-4 ml-2" />
              התחל תקופת ניסיון
            </>
          ) : (
            <>
              <ExternalLink className="h-4 w-4 ml-2" />
              לתשלום מאובטח
            </>
          )}
        </Button>
      </div>
      
      {/* Security message */}
      <div className="text-xs text-center text-gray-500 mt-4">
        <p>תשלום מאובטח באמצעות אישורית זהב | כל הפרטים מוצפנים ומוגנים</p>
      </div>
    </div>
  );
};

export default CardcomOpenFields;
