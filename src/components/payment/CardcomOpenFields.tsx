
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionPlans } from './utils/paymentHelpers';

// Iframe states
enum IframeStatus {
  LOADING = 'loading',
  READY = 'ready',
  ERROR = 'error',
  SUBMITTING = 'submitting'
}

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

  // State
  const [status, setStatus] = useState<IframeStatus>(IframeStatus.LOADING);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  
  // Get plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  // Get registration data and user email
  useEffect(() => {
    const loadUserData = async () => {
      setIsLoadingUserData(true);
      try {
        // Get registration data from session storage if available
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          setRegistrationData(parsedData);
          
          // Get email from registration data if available
          if (parsedData?.email) {
            setEmail(parsedData.email);
          } else if (parsedData?.userData?.email) {
            setEmail(parsedData.userData.email);
          }
        }

        // Get email from auth context if authenticated
        if (user?.email) {
          setEmail(user.email);
        } else if (contextEmail) {
          setEmail(contextEmail);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setIsLoadingUserData(false);
      }
    };
    
    loadUserData();
  }, [user, contextEmail]);

  // Initialize payment session with our backend
  useEffect(() => {
    const initializePayment = async () => {
      if (!email || isLoadingUserData) return;
      
      try {
        setStatus(IframeStatus.LOADING);
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
        setStatus(IframeStatus.READY);
        
        console.log('Payment session initialized:', {
          lowProfileId: data.lowProfileId,
          url: data.url
        });
        
      } catch (error) {
        console.error('Payment initialization error:', error);
        setStatus(IframeStatus.ERROR);
        setError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
        
        if (onError) {
          onError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
        }
      }
    };
    
    initializePayment();
  }, [email, isLoadingUserData, plan, planId, user?.id, fullName, registrationData, onError]);
  
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
  if (isLoadingUserData || status === IframeStatus.LOADING) {
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
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-700 mb-2">לא נמצאה כתובת אימייל עבור התשלום.</p>
        <p className="text-red-600 text-sm mb-4">אנא וודא שהנך מחובר למערכת או השלם את תהליך ההרשמה.</p>
        <Button 
          variant="outline" 
          onClick={onCancel} 
          className="mx-auto"
        >
          חזור
        </Button>
      </div>
    );
  }

  // Error state
  if (error || status === IframeStatus.ERROR) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        <p className="text-red-700 text-sm">{error || 'אירעה שגיאה בטעינת טופס התשלום'}</p>
        <div className="flex justify-center mt-4">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="mx-2"
          >
            חזור
          </Button>
          <Button 
            type="button" 
            variant="default"
            onClick={() => window.location.reload()}
            className="mx-2"
          >
            נסה שוב
          </Button>
        </div>
      </div>
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
            'התחל תקופת ניסיון'
          ) : (
            'לתשלום מאובטח'
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
