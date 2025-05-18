
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { verifyPayment, logPaymentError } from '../services/cardcomService';

interface UsePaymentVerificationProps {
  lowProfileId: string | null;
  skipVerification?: boolean;
  onVerificationComplete?: (result: any) => void;
  redirectOnSuccess?: boolean;
  redirectPath?: string;
}

export function usePaymentVerification({
  lowProfileId,
  skipVerification = false,
  onVerificationComplete,
  redirectOnSuccess = true,
  redirectPath = '/dashboard'
}: UsePaymentVerificationProps) {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(!skipVerification);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);

  useEffect(() => {
    // Skip verification if requested or if no ID is provided
    if (skipVerification || !lowProfileId) {
      setIsLoading(false);
      if (!lowProfileId) {
        setError('חסר מזהה תשלום');
      }
      return;
    }

    async function executeVerification() {
      try {
        console.log('Verifying payment with lowProfileId:', lowProfileId);
        
        // Call the verification service
        const result = await verifyPayment(lowProfileId);
        
        if (result.success) {
          setPaymentDetails({
            source: result.source || 'api_verification',
            details: result.paymentDetails,
            tokenInfo: result.tokenInfo,
            success: true
          });
          
          toast.success('התשלום התקבל בהצלחה!');
          
          if (onVerificationComplete) {
            onVerificationComplete(result);
          }
          
          // Navigate to success path if requested
          if (redirectOnSuccess) {
            navigate(redirectPath);
          }
        } else {
          setError(result.message || 'אירעה שגיאה באימות התשלום');
          
          if (onVerificationComplete) {
            onVerificationComplete({
              success: false, 
              error: result.error || result.message
            });
          }
        }
      } catch (err: any) {
        logPaymentError(err, undefined, 'payment_verification', {
          lowProfileId,
          error: err?.message || String(err)
        });
        
        setError('אירעה שגיאה בעת עיבוד נתוני התשלום');
        
        if (onVerificationComplete) {
          onVerificationComplete({
            success: false,
            error: err?.message || 'Unknown error'
          });
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (lowProfileId) {
      executeVerification();
    } else {
      setIsLoading(false);
    }
  }, [lowProfileId, navigate, skipVerification, onVerificationComplete, redirectOnSuccess, redirectPath]);

  return {
    isLoading,
    error,
    paymentDetails
  };
}
