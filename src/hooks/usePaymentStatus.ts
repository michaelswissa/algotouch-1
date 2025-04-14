
import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * A hook to check payment status from URL parameters
 */
const usePaymentStatus = (redirectTo?: string) => {
  const [isChecking, setIsChecking] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const success = params.get('success');
    const error = params.get('error');

    if (success === 'true') {
      setPaymentSuccess(true);
      if (redirectTo) {
        setTimeout(() => {
          navigate(redirectTo);
        }, 2000);
      }
    } else if (error === 'true') {
      setPaymentError('אירעה שגיאה בתהליך התשלום');
    }
  }, [location.search, navigate, redirectTo]);

  // Function for manual payment check - placeholder for future implementation
  const manualCheckPayment = async (paymentId: string, planId?: string) => {
    setIsChecking(true);
    try {
      console.log('Payment check placeholder for ID:', paymentId, 'Plan:', planId);
      // Placeholder for future implementation
      setIsChecking(false);
      return { success: false, error: 'מערכת התשלומים נמצאת בתהליך שדרוג' };
    } catch (error) {
      console.error('Error checking payment:', error);
      setPaymentError('אירעה שגיאה בבדיקת סטטוס התשלום');
      setIsChecking(false);
      return { success: false, error: 'אירעה שגיאה בבדיקת סטטוס התשלום' };
    }
  };

  return {
    isChecking,
    paymentSuccess,
    paymentError,
    manualCheckPayment
  };
};

export default usePaymentStatus;
