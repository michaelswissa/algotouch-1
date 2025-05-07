
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
      // Set operation type based on the selected plan
      // Monthly: CreateTokenOnly - Only create token for future billing, no immediate payment
      // Annual: ChargeAndCreateToken - Charge and create token for future billing
      // VIP: ChargeOnly - Charge once without creating token (one-time payment)
      let operationType: number;
      
      switch (selectedPlan) {
        case 'monthly':
          operationType = 3; // CreateTokenOnly - token only without charging
          break;
        case 'annual':
          operationType = 2; // ChargeAndCreateToken - charge and create token
          break;
        case 'vip':
        default:
          operationType = 1; // ChargeOnly - charge without creating token
          break;
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
        plan: selectedPlan,
        operationType
      });

      // Prepare payload based on whether user is logged in or not
      const payload = {
        planId: selectedPlan,
        userId: user?.id,
        fullName: userFullName,
        email: userEmail,
        operationType,
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

  // Helper function to get plan amount
  const getPlanAmount = (plan: string): number => {
    switch (plan) {
      case 'monthly':
        return 0.00; // Free first month, will be charged monthly after trial
      case 'annual':
        return 3371.00; // Annual payment
      case 'vip':
        return 13121.00; // One-time VIP payment
      default:
        return 0.00;
    }
  };

  return {
    isLoading,
    paymentUrl,
    initiateCardcomPayment
  };
};
