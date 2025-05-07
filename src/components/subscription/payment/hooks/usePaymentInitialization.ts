
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { useAuth } from '@/contexts/auth';

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
  
  // Use either the external loading state or the internal one
  const setIsLoading = setIsLoadingExternal || setIsLoadingState;

  // Automatically create iframe payment URL on component mount
  useEffect(() => {
    initiateCardcomPayment();
  }, []);

  const initiateCardcomPayment = async () => {
    setIsLoading(true);
    try {
      // Define operation types based on plan
      // 1: ChargeOnly - for one-time VIP payment
      // 2: ChargeAndCreateToken - for annual with immediate charge and future charges
      // 3: CreateTokenOnly - for monthly with trial (no initial charge)
      let operationType = 3; // Default: token creation only (for monthly trial)
      
      if (selectedPlan === 'annual') {
        operationType = 2; // Charge and create token
      } else if (selectedPlan === 'vip') {
        operationType = 1; // Charge only
      }

      // Get registration data if available (for guest checkout)
      const registrationData = sessionStorage.getItem('registration_data') 
        ? JSON.parse(sessionStorage.getItem('registration_data') || '{}')
        : null;

      if (!user && !registrationData) {
        toast.error('נדרשים פרטי הרשמה כדי להמשיך');
        setIsLoading(false);
        return;
      }

      // Extract user details from the context data or registration data
      const userFullName = fullName || registrationData?.userData?.fullName || '';
      const userEmail = email || user?.email || registrationData?.userData?.email || '';
      const userPhone = userData?.phone || registrationData?.userData?.phone || '';
      const userIdNumber = userData?.idNumber || registrationData?.userData?.idNumber || '';

      console.log('Sending user details to payment system:', {
        fullName: userFullName,
        email: userEmail,
        phone: userPhone,
        idNumber: userIdNumber,
        operationType,
        amount: getPlanAmount(selectedPlan)
      });

      // Prepare payload based on whether user is logged in or not
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: userFullName,
        email: userEmail,
        operationType, // Send numeric operation type (1, 2, or 3)
        origin: window.location.origin,
        amount: getPlanAmount(selectedPlan),
        webHookUrl: `${window.location.origin}/api/payment-webhook`,
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

      const { data, error } = await supabase.functions.invoke('cardcom-iframe-redirect', {
        body: payload
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data?.url) {
        // Store temporary registration ID if available
        if (data.tempRegistrationId) {
          localStorage.setItem('temp_registration_id', data.tempRegistrationId);
        }
        
        setPaymentUrl(data.url);
      } else {
        throw new Error('לא התקבלה כתובת תשלום מהשרת');
      }
    } catch (error: any) {
      console.error('Error initiating Cardcom payment:', error);
      toast.error(error.message || 'שגיאה ביצירת עסקה');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to get plan amount (in shekels, not agorot)
  const getPlanAmount = (plan: string): number => {
    switch (plan) {
      case 'monthly':
        return 0; // No initial charge for monthly plan (token only)
      case 'annual':
        return 3371; // 3,371 ₪ (updated to shekels instead of agorot)
      case 'vip':
        return 13121; // 13,121 ₪ (updated to shekels instead of agorot)
      default:
        return 0;
    }
  };

  return {
    isLoading,
    paymentUrl,
    initiateCardcomPayment
  };
};
