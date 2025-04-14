
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { getSubscriptionPlans } from './utils/paymentHelpers';

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

  // Component state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [cardOwnerName, setCardOwnerName] = useState('');
  const [isLoadingUserData, setIsLoadingUserData] = useState(true);
  const [paymentInitialized, setPaymentInitialized] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  // Get subscription plans data
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;
  
  // Get registration data and email
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

        // Set cardOwnerName if available
        if (fullName) {
          setCardOwnerName(fullName);
        } else if (registrationData?.userData?.firstName && registrationData?.userData?.lastName) {
          setCardOwnerName(`${registrationData.userData.firstName} ${registrationData.userData.lastName}`);
        }
      } catch (err) {
        console.error('Error loading user data:', err);
      } finally {
        setIsLoadingUserData(false);
      }
    };
    
    loadUserData();
  }, [user, contextEmail, fullName, registrationData]);

  // Initialize a payment session with our backend
  useEffect(() => {
    const initializePayment = async () => {
      if (paymentInitialized || isLoadingUserData || !email) return;
      
      try {
        setPaymentInitialized(true);
        console.log('Initializing payment with email:', email);
        
        // Ensure we have a valid email to use
        if (!email) {
          throw new Error('Missing email address required for payment processing');
        }
        
        // Get plan amount
        const amount = plan.price;
        
        // Prepare user data
        const userData = {
          planId,
          planName: plan.name,
          amount,
          userId: user?.id,
          userName: cardOwnerName || fullName || '',
          email,
          userEmail: email,
          isRecurring: planId !== 'vip',
          freeTrialDays: plan.freeTrialDays || 0,
          registrationData
        };
        
        console.log('Initializing payment with data:', {
          planId,
          amount,
          email,
          userName: userData.userName,
          hasRegistrationData: !!registrationData
        });
        
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
        
        console.log('Payment initialization successful:', data);
        
        // Store the lowProfileId and payment URL for the redirect
        localStorage.setItem('payment_pending_id', data.lowProfileId);
        localStorage.setItem('payment_pending_plan', planId);
        localStorage.setItem('payment_session_created', new Date().toISOString());
        
        // Store URL for redirect
        setPaymentUrl(data.url);
        
        console.log('Payment URL received:', data.url);
        
      } catch (error) {
        console.error('Payment initialization error:', error);
        setError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
        onError?.(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
        setPaymentInitialized(false); // Allow retrying
      }
    };
    
    initializePayment();
  }, [email, isLoadingUserData, paymentInitialized, planId, plan, user?.id, cardOwnerName, fullName, registrationData, onError]);
  
  // Redirect to payment page
  const handleRedirectToPayment = () => {
    if (!paymentUrl) {
      toast.error('Payment URL not available. Please try again.');
      return;
    }
    
    setLoading(true);
    if (onPaymentStart) {
      onPaymentStart();
    }
    
    // Log before redirect
    console.log('Redirecting to payment page:', paymentUrl);
    
    // Redirect to Cardcom payment page
    window.location.href = paymentUrl;
  };

  // Manual initialization retry
  const retryInitialization = () => {
    setPaymentInitialized(false);
    setError(null);
  };
  
  // If there's no email available, show error state
  if (!isLoadingUserData && !email) {
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

  // Show loading state while initializing
  if (isLoadingUserData) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="h-8 w-8 border-4 border-t-primary animate-spin rounded-full mr-2"></div>
        <span>טוען נתוני משתמש...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6" dir="rtl">
      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700 text-sm">{error}</p>
          {!paymentUrl && (
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={retryInitialization}
              className="mt-2"
            >
              נסה שוב
            </Button>
          )}
        </div>
      )}
      
      {/* Payment form - Simple version with redirect */}
      <div className="space-y-4">
        {/* Card Owner Name */}
        <div className="space-y-2">
          <label htmlFor="cardOwnerName" className="block text-sm font-medium text-gray-700">
            שם בעל הכרטיס
          </label>
          <input
            id="cardOwnerName"
            name="cardOwnerName"
            type="text"
            value={cardOwnerName}
            onChange={(e) => setCardOwnerName(e.target.value)}
            placeholder="שם בעל הכרטיס"
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-primary focus:border-primary"
            disabled={loading || !email}
          />
        </div>
        
        {/* Email confirmation */}
        <div className="py-2">
          <p className="text-sm text-gray-600">
            אימייל לקבלת אישור תשלום:{" "}
            <span className="font-medium">{email}</span>
          </p>
        </div>
        
        {/* Total amount */}
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
        
        {/* Action buttons */}
        <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={loading}
          >
            ביטול
          </Button>
          
          <Button
            type="button"
            onClick={handleRedirectToPayment}
            disabled={loading || !paymentUrl || !email}
            className="sm:mr-2"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                מעבד תשלום...
              </>
            ) : !paymentUrl ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                מכין טופס תשלום...
              </>
            ) : planId !== 'vip' && plan.hasTrial && (plan.freeTrialDays || 0) > 0 ? (
              'התחל תקופת ניסיון'
            ) : (
              'עבור לדף התשלום'
            )}
          </Button>
        </div>
        
        {/* Security message */}
        <div className="text-xs text-center text-gray-500 mt-4">
          <p>תשלום מאובטח באמצעות אישורית זהב | כל הפרטים מוצפנים ומוגנים</p>
          <p className="mt-2">
            לצורך ביצוע התשלום תועבר/י לדף תשלום מאובטח של חברת הסליקה
          </p>
        </div>
      </div>
    </div>
  );
};

export default CardcomOpenFields;
