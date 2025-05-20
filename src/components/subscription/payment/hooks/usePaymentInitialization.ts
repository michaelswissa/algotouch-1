
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';
import { v4 as uuidv4 } from 'uuid';
import { PaymentLogger } from '@/services/logging/paymentLogger';
import { handlePaymentError } from '@/components/payment/utils/errorHandling';

// Helper function to get plan amount based on plan ID
const getPlanAmount = (planId: string): number => {
  switch (planId) {
    case 'monthly':
      return 1; // 1 ILS for trial period charge
    case 'annual':
      return 1188; // Annual plan full price
    case 'vip':
      return 2988; // VIP plan full price
    default:
      return 1;
  }
};

export const usePaymentInitialization = (
  selectedPlan: string,
  onPaymentComplete: () => void,
  onBack: () => void,
  setIsLoadingExternal?: (val: boolean) => void
) => {
  const { fullName, email, userData } = useSubscriptionContext();
  const { user } = useAuth();
  const [isLoading, setIsLoadingState] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  
  // Use either the external loading state or the internal one
  const setIsLoading = setIsLoadingExternal || setIsLoadingState;

  // Automatically create iframe payment URL on component mount
  useEffect(() => {
    initiateCardcomPayment();
  }, []);

  const initiateCardcomPayment = async () => {
    // Reset states before starting
    setIsLoading(true);
    setInitError(null);
    
    try {
      // Log payment initialization start
      PaymentLogger.info('Starting payment initialization', 'payment-init', { plan: selectedPlan });
      
      // Define operation types based on plan
      // 1: ChargeOnly - for one-time VIP payment
      // 2: ChargeAndCreateToken - for annual with immediate charge and future charges
      // 3: CreateTokenOnly - for monthly with trial (no initial charge)
      let operationType = 2; // Default to ChargeAndCreateToken
      
      if (selectedPlan === 'annual') {
        operationType = 2; // Charge and create token
      } else if (selectedPlan === 'vip') {
        operationType = 1; // Charge only
      }
      
      PaymentLogger.info('Determined operation type', 'payment-init', { 
        plan: selectedPlan, 
        operationType 
      });

      // Get registration data if available (for guest checkout)
      const registrationData = sessionStorage.getItem('registration_data') 
        ? JSON.parse(sessionStorage.getItem('registration_data') || '{}')
        : null;

      if (!user && !registrationData) {
        const errorMsg = 'נדרשים פרטי הרשמה כדי להמשיך';
        PaymentLogger.error('Missing registration data', 'payment-init', { hasUser: !!user });
        toast.error(errorMsg);
        setInitError(errorMsg);
        setIsLoading(false);
        return;
      }

      // Extract user details from the context data or registration data
      const userFullName = fullName || registrationData?.userData?.fullName || '';
      const userEmail = email || user?.email || registrationData?.userData?.email || '';
      const userPhone = userData?.phone || registrationData?.userData?.phone || '';
      const userIdNumber = userData?.idNumber || registrationData?.userData?.idNumber || '';

      // Generate a proper UUID for temp registration ID and add consistent prefix
      // FIXED: Now always using a UUID with consistent prefix for temporary registrations
      const registrationUuid = uuidv4();
      const tempRegistrationId = user?.id || `temp_reg_${registrationUuid}`;

      // Set the webhook URL to the full Supabase Edge Function URL
      const webhookUrl = `https://ndhakvhrrkczgylcmyoc.supabase.co/functions/v1/cardcom-webhook`;

      // Prepare payload
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: userFullName,
        email: userEmail,
        operationType, 
        origin: window.location.origin,
        amount: getPlanAmount(selectedPlan),
        webHookUrl: webhookUrl,
        // Include registration data for account creation after payment
        registrationData: registrationData,
        // Add user details for payment form pre-fill
        userDetails: {
          fullName: userFullName,
          email: userEmail,
          phone: userPhone,
          idNumber: userIdNumber
        }
      };

      PaymentLogger.info('Prepared payload for payment initialization', 'payment-init', {
        planId: selectedPlan,
        hasUserId: !!user?.id,
        hasEmail: !!userEmail,
        operationType
      });
      console.log('Initializing payment with payload:', payload);
      console.log('Using temporary registration ID:', tempRegistrationId);

      // Call the edge function to create a payment session
      PaymentLogger.info('Calling cardcom-iframe-redirect function', 'payment-init');
      const { data, error } = await supabase.functions.invoke('cardcom-iframe-redirect', {
        body: {
          ...payload,
          tempRegistrationId // Pass the consistent format temporary ID
        }
      });

      if (error) {
        console.error('Error creating payment URL:', error);
        PaymentLogger.error('Failed to create payment URL', 'payment-init', {
          error: error.message,
          details: error
        });
        throw new Error(error.message);
      }

      if (!data?.url) {
        const errorMsg = 'לא ניתן ליצור קישור לתשלום';
        PaymentLogger.error('No URL returned from payment function', 'payment-init');
        throw new Error(errorMsg);
      }

      // Store registration ID for post-payment processing
      if (tempRegistrationId && !user?.id) {
        localStorage.setItem('temp_registration_id', tempRegistrationId);
        PaymentLogger.info('Stored temporary registration ID', 'payment-init', { tempRegistrationId });
      }

      setPaymentUrl(data.url);
      setInitError(null);
      PaymentLogger.success('Payment URL generated successfully', 'payment-init', {
        hasUrl: !!data.url,
        plan: selectedPlan
      });
      
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      
      // Use structured error handling approach
      handlePaymentError(err, user?.id, email, undefined, {
        paymentDetails: { plan: selectedPlan },
        shouldRetry: false
      });
      
      setInitError(err.message || 'שגיאה בהגדרת תהליך התשלום');
      toast.error('שגיאה ביצירת עמוד התשלום');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    paymentUrl,
    initiateCardcomPayment,
    isLoading,
    error: initError
  };
};
