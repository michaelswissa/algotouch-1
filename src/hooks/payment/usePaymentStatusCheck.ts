
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentStatus, PaymentStatusType } from '@/types/payment';
import { StorageService } from '@/services/storage/StorageService';
import { toast } from 'sonner';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

interface PaymentStatusCheckOptions {
  sessionId: string;
  onSuccess?: (data: any) => void;
  onFailure?: (error: any) => void;
  redirectOnSuccess?: string;
  redirectOnFailure?: string;
  maxAttempts?: number;
  interval?: number;
}

export const usePaymentStatusCheck = (options: PaymentStatusCheckOptions) => {
  const {
    sessionId,
    onSuccess,
    onFailure,
    redirectOnSuccess = '/subscription/success',
    redirectOnFailure = '/subscription/failed',
    maxAttempts = 20,
    interval = 2000
  } = options;

  const navigate = useNavigate();
  const [status, setStatus] = useState<PaymentStatusType>(PaymentStatus.INITIALIZING);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [checkInProgress, setCheckInProgress] = useState(false);
  const [paymentData, setPaymentData] = useState<any>(null);
  
  // Function to check payment status
  const checkStatus = async () => {
    if (!sessionId || checkInProgress || attempts >= maxAttempts) {
      return;
    }

    setCheckInProgress(true);
    try {
      PaymentLogger.log('Checking payment status', { sessionId, attempt: attempts + 1 });
      const response = await CardComService.checkPaymentStatus(sessionId);
      
      setPaymentData(response.data);
      
      if (response.success) {
        // Map the status returned from the API to our internal status
        const responseStatus = response.status;
        
        if (responseStatus === 'success' || responseStatus === 'completed' || responseStatus === 'approved') {
          // Payment successful
          setStatus(PaymentStatus.SUCCESS);
          
          if (onSuccess) {
            onSuccess(response.data);
          }
          
          // Redirect to success page if not already there
          if (redirectOnSuccess && !window.location.pathname.includes('success')) {
            navigate(redirectOnSuccess, { replace: true });
          }
          
          return;
        } else if (responseStatus === 'processing' || responseStatus === 'pending') {
          // Payment is still processing
          setStatus(PaymentStatus.PROCESSING);
          
          // Continue checking
          setAttempts(prev => prev + 1);
        } else if (responseStatus === 'failed' || responseStatus === 'cancelled') {
          // Payment failed
          setStatus(PaymentStatus.FAILED);
          setErrorMessage(response.message || 'Payment process failed');
          
          if (onFailure) {
            onFailure(response);
          }
          
          // Redirect to failure page
          if (redirectOnFailure) {
            navigate(redirectOnFailure, { replace: true });
          }
          
          return;
        } else {
          // Unknown status
          setStatus(PaymentStatus.PROCESSING);
          setAttempts(prev => prev + 1);
        }
      } else {
        // Error in checking status
        setAttempts(prev => prev + 1);
        setErrorMessage(response.message || 'Error checking payment status');
        
        // After max attempts, mark as failed
        if (attempts >= maxAttempts - 1) {
          setStatus(PaymentStatus.FAILED);
          
          if (onFailure) {
            onFailure(response);
          }
          
          // Redirect to failure page
          if (redirectOnFailure) {
            navigate(redirectOnFailure, { replace: true });
          }
        }
      }
    } catch (error) {
      PaymentLogger.error('Error checking payment status:', error);
      setAttempts(prev => prev + 1);
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
      
      // After max attempts, mark as failed
      if (attempts >= maxAttempts - 1) {
        setStatus(PaymentStatus.FAILED);
        
        if (onFailure) {
          onFailure(error);
        }
        
        // Redirect to failure page
        if (redirectOnFailure) {
          navigate(redirectOnFailure, { replace: true });
        }
      }
    } finally {
      setCheckInProgress(false);
    }
  };

  // Check status on component mount and when sessionId changes
  useEffect(() => {
    if (sessionId) {
      checkStatus();
      
      // Continue checking until we reach a terminal state or max attempts
      const intervalId = setInterval(() => {
        // Only continue if we're still processing and haven't reached max attempts
        if (status === PaymentStatus.PROCESSING || status === PaymentStatus.INITIALIZING) {
          if (attempts < maxAttempts) {
            checkStatus();
          } else if (status === PaymentStatus.INITIALIZING || status === PaymentStatus.PROCESSING) {
            // If we've reached max attempts and aren't already in FAILED state
            setStatus(PaymentStatus.FAILED);
            setErrorMessage('Payment process timed out');
            
            if (onFailure) {
              onFailure({ message: 'Payment process timed out' });
            }
            
            // Redirect to failure page
            if (redirectOnFailure) {
              navigate(redirectOnFailure, { replace: true });
            }
            
            // Clear interval
            clearInterval(intervalId);
          }
        } else {
          // Clear interval if we're in a terminal state
          clearInterval(intervalId);
        }
      }, interval);
      
      // Cleanup
      return () => clearInterval(intervalId);
    }
  }, [sessionId, attempts, status]);

  return {
    status,
    errorMessage,
    attempts,
    maxAttempts,
    checkStatus,
    paymentData
  };
};
