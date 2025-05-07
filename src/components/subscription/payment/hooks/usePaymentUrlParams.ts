
import { useEffect } from 'react';
import { toast } from 'sonner';
import { usePaymentProcessing } from './usePaymentProcessing';

export const usePaymentUrlParams = (
  onPaymentComplete: () => void,
  setIsLoading: (val: boolean) => void
) => {
  const { verifyPaymentAndCompleteRegistration, retrieveAndProcessRegistrationData } = usePaymentProcessing();

  useEffect(() => {
    // Check if there's stored payment data from a postMessage success
    const paymentDataString = sessionStorage.getItem('payment_success_data');
    if (paymentDataString) {
      try {
        const paymentData = JSON.parse(paymentDataString);
        console.log('Found stored payment data:', paymentData);
        
        // Only process recently stored data (within last 5 minutes)
        const timestamp = new Date(paymentData.timestamp).getTime();
        const now = new Date().getTime();
        const fiveMinutesInMs = 5 * 60 * 1000;
        
        if (now - timestamp < fiveMinutesInMs) {
          // If we have a registration ID, verify the payment with the backend
          const regId = localStorage.getItem('temp_registration_id');
          if (regId) {
            console.log('Found registration ID, verifying payment:', regId);
            verifyPaymentAndCompleteRegistration(regId, onPaymentComplete, setIsLoading);
          } else {
            console.log('No registration ID found, completing payment directly');
            onPaymentComplete();
          }
          
          // Clear the stored payment data
          sessionStorage.removeItem('payment_success_data');
        }
      } catch (error) {
        console.error('Error processing stored payment data:', error);
      }
    }
    
    // Always check for temp registration ID in localStorage
    const storedRegId = localStorage.getItem('temp_registration_id');
    if (storedRegId) {
      console.log('Found stored registration ID:', storedRegId);
      retrieveAndProcessRegistrationData(storedRegId, onPaymentComplete);
    }
  }, [onPaymentComplete]);
};
