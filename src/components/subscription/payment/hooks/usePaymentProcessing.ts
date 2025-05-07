
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Define types to avoid deep instantiation issues
interface RegistrationData {
  id: string;
  payment_verified?: boolean;
  used?: boolean;
}

export const usePaymentProcessing = () => {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  // Verify payment and complete registration if needed
  const verifyPaymentAndCompleteRegistration = async (
    registrationId: string,
    onComplete: () => void,
    setIsLoading?: (val: boolean) => void
  ) => {
    try {
      if (setIsLoading) setIsLoading(true);
      setIsVerifying(true);
      
      console.log(`Verifying payment for registration ID: ${registrationId}`);
      
      // Call the verify-payment-registration function to check the payment status
      const { data, error } = await supabase.functions.invoke('verify-payment-registration', {
        body: { registrationId }
      });
      
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.message || 'Payment verification failed');
      
      console.log('Payment verification successful:', data);
      toast.success('התשלום אומת בהצלחה');
      
      // Clear the registration ID after successful verification
      localStorage.removeItem('temp_registration_id');
      
      // Complete the registration process
      onComplete();
      
    } catch (error: any) {
      console.error('Payment verification error:', error);
      toast.error(`שגיאה באימות התשלום: ${error.message}`);
    } finally {
      setIsVerifying(false);
      if (setIsLoading) setIsLoading(false);
    }
  };
  
  // Retrieve and process the temporary registration data
  const retrieveAndProcessRegistrationData = async (
    registrationId: string,
    onComplete: () => void
  ) => {
    try {
      setIsRegistering(true);
      
      // Get the registration data from the temp storage
      const { data, error } = await supabase
        .from('temp_registration_data')
        .select('*')
        .eq('id', registrationId)
        .single();
        
      if (error || !data) {
        console.log('Registration data not found or not yet verified');
        return;
      }
      
      // Add explicit type checking to avoid property access errors
      const registrationData = data as unknown as RegistrationData;
      
      // If payment is verified but user isn't registered yet, complete the process
      if (registrationData && registrationData.payment_verified && !registrationData.used) {
        console.log('Found verified payment for registration:', registrationId);
        onComplete();
      }
      
    } catch (error: any) {
      console.error('Error retrieving registration data:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  return {
    isVerifying,
    isRegistering,
    verifyPaymentAndCompleteRegistration,
    retrieveAndProcessRegistrationData
  };
};
