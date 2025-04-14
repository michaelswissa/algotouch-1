
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [email, setEmail] = useState<string | null>(null);

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
      }
    };
    
    loadUserData();
  }, [user, contextEmail]);

  const handlePayment = async () => {
    if (!email) {
      setError('אימייל חסר. לא ניתן להמשיך בתהליך התשלום.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Notify parent component that payment process is starting
      if (onPaymentStart) {
        onPaymentStart();
      }
      
      // Get user name if available
      const userName = fullName || 
        (registrationData?.userData?.firstName && registrationData?.userData?.lastName 
          ? `${registrationData.userData.firstName} ${registrationData.userData.lastName}` 
          : '');

      // Get plan amount
      const amount = plan.price;
      
      // Prepare user data for payment
      const userData = {
        planId,
        planName: plan.name,
        amount,
        userId: user?.id,
        userName,
        email,
        registrationData,
        isRecurring: planId !== 'vip'
      };
      
      console.log('Initializing payment with data:', {
        planId,
        amount,
        email,
        userName
      });
      
      // Call Supabase edge function to initialize payment
      const { data, error: apiError } = await supabase.functions.invoke('cardcom-openfields', {
        body: userData
      });
      
      if (apiError) {
        throw new Error(`Error initializing payment: ${apiError.message}`);
      }
      
      if (!data || !data.success || !data.url) {
        throw new Error(data?.error || 'Failed to initialize payment');
      }
      
      // Store the session ID for reference
      localStorage.setItem('payment_pending_id', data.lowProfileId);
      localStorage.setItem('payment_pending_plan', planId);
      localStorage.setItem('payment_session_created', new Date().toISOString());
      
      console.log('Payment session initialized, redirecting to:', data.url);
      
      // Redirect to Cardcom payment page
      window.location.href = data.url;
      
    } catch (error) {
      console.error('Payment initialization error:', error);
      setError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
      if (onError) {
        onError(error instanceof Error ? error.message : 'אירעה שגיאה באתחול התשלום');
      }
      setIsLoading(false);
    }
  };

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

  return (
    <div className="space-y-6" dir="rtl">
      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      {/* Payment details */}
      <div className="rounded-lg border p-4 bg-card">
        <h3 className="font-medium text-lg mb-2">פרטי התשלום</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>תכנית:</span>
            <span className="font-medium">{plan.name}</span>
          </div>
          
          <div className="flex justify-between">
            <span>סכום:</span>
            <span className="font-medium">{plan.price} ₪</span>
          </div>
          
          {planId !== 'vip' && plan.hasTrial && (plan.freeTrialDays || 0) > 0 && (
            <div className="text-sm text-green-600 font-medium">
              * כולל {plan.freeTrialDays} ימי ניסיון בחינם
            </div>
          )}
          
          <div className="pt-2">
            <p className="text-sm text-gray-500">
              התשלום יבוצע באמצעות אישורית זהב, מערכת סליקה מאובטחת.
            </p>
          </div>
        </div>
      </div>
      
      {/* User details */}
      <div className="rounded-lg border p-4 bg-card">
        <h3 className="font-medium text-lg mb-2">פרטי המשלם</h3>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <span>שם:</span>
            <span className="font-medium">{fullName || 'לא צוין'}</span>
          </div>
          
          <div className="flex justify-between">
            <span>אימייל:</span>
            <span className="font-medium">{email}</span>
          </div>
        </div>
      </div>
      
      {/* Action buttons */}
      <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2 sm:justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          ביטול
        </Button>
        
        <Button
          type="button"
          onClick={handlePayment}
          disabled={isLoading}
          className="sm:mr-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              מעבר לדף התשלום...
            </>
          ) : planId !== 'vip' && plan.hasTrial && (plan.freeTrialDays || 0) > 0 ? (
            'התחל תקופת ניסיון'
          ) : (
            'המשך לתשלום'
          )}
        </Button>
      </div>
      
      {/* Security message */}
      <div className="text-xs text-center text-gray-500 mt-4">
        <p>תשלום מאובטח באמצעות אישורית זהב | כל הפרטים מוצפנים ומוגנים</p>
        <p className="mt-1">הסליקה מתבצעת באמצעות אישורית זהב</p>
      </div>
    </div>
  );
};

export default CardcomOpenFields;
