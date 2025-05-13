
/**
 * Unified payment hook for processing payments
 */

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { TokenData } from '@/types/payment';
import { toast } from 'sonner';

// Import our new unified services
import { 
  processPayment,
  PaymentOptions,
  PaymentResult,
  getSubscriptionPlans 
} from '@/services/payment/paymentCore';
import { 
  logPaymentError,
  processPaymentError
} from '@/services/payment/errorHandling';
import {
  savePaymentSession,
  getRecoverySession,
  sendRecoveryEmail
} from '@/services/payment/recoveryService';

interface UsePaymentProps {
  planId: string;
  onPaymentComplete?: () => void;
  onPaymentError?: (error: any) => void;
  redirectOnSuccess?: string;
}

export function usePayment({
  planId,
  onPaymentComplete,
  onPaymentError,
  redirectOnSuccess
}: UsePaymentProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  // Get plan details
  const plans = getSubscriptionPlans();
  const plan = plans[planId as keyof typeof plans] || plans.monthly;

  /**
   * Check for recovery from URL
   */
  const checkForRecovery = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const recoveryId = urlParams.get('recover');
    
    if (recoveryId) {
      setIsRecovering(true);
      setSessionId(recoveryId);
      
      try {
        const sessionData = await getRecoverySession(recoveryId);
        
        if (!sessionData) {
          toast.error('לא נמצא מידע להשלמת התשלום או שפג תוקף הקישור');
          setIsRecovering(false);
          return null;
        }
        
        return {
          planId: sessionData.plan_id,
          email: sessionData.email,
          paymentDetails: sessionData.payment_details
        };
      } catch (error) {
        console.error('Error recovering session:', error);
        setIsRecovering(false);
      }
    }
    
    return null;
  };

  /**
   * Handler for payment errors
   */
  const handleError = async (error: any, paymentDetails?: any) => {
    // Create session ID for potential recovery
    const newSessionId = await savePaymentSession({
      userId: user?.id,
      email: user?.email,
      planId,
      paymentDetails
    });
    
    if (newSessionId) {
      setSessionId(newSessionId);
    }
    
    // Log the error
    const errorInfo = await logPaymentError(
      error, 
      user?.id || 'anonymous', 
      'payment-processing', 
      paymentDetails
    );
    
    // Process the error for user-friendly display
    const processedError = processPaymentError(error);
    setPaymentError(processedError);
    
    // Call onPaymentError callback if provided
    if (onPaymentError) {
      onPaymentError(processedError);
    }
    
    // Send recovery email for authenticated users
    if (user?.email && user?.id) {
      sendRecoveryEmail(user.email, errorInfo, newSessionId || sessionId);
    }
    
    return errorInfo;
  };

  /**
   * Process a card payment
   */
  const handleCardPayment = async (tokenData: TokenData) => {
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      // Define operation type based on plan
      let operationType = 3; // Default: token creation only (for monthly subscription with free trial)
      
      if (planId === 'annual') {
        operationType = 2; // Charge and create token for recurring annual payments
      } else if (planId === 'vip') {
        operationType = 1; // Charge only - one-time payment
      }
      
      // Create payment options
      const paymentOptions: PaymentOptions = {
        planId,
        userId: user?.id,
        email: user?.email,
        tokenData,
        operationType,
        metadata: {
          source: 'card_payment_form',
          recoverySessionId: sessionId
        }
      };
      
      // Process the payment
      const result = await processPayment(paymentOptions);
      
      if (!result.success) {
        throw new Error(result.error || 'Payment failed');
      }
      
      // Success handling
      toast.success('התשלום התקבל בהצלחה!');
      
      // Handle completion
      if (onPaymentComplete) {
        onPaymentComplete();
      }
      
      // Redirect if needed
      if (redirectOnSuccess) {
        navigate(redirectOnSuccess);
      }
      
      return result;
    } catch (error) {
      await handleError(error, { tokenData, planId });
      return { success: false, error };
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Handle external payment method (redirect flow)
   */
  const handleExternalPayment = async () => {
    setIsProcessing(true);
    setPaymentError(null);
    
    try {
      // Create payment options for external flow
      const paymentOptions: PaymentOptions = {
        planId,
        userId: user?.id,
        email: user?.email,
        returnUrl: `${window.location.origin}/payment/success`,
        metadata: {
          source: 'external_payment_flow',
          recoverySessionId: sessionId
        }
      };
      
      // Initialize the external payment
      const result = await processPayment(paymentOptions);
      
      if (!result.success || !result.details?.redirectUrl) {
        throw new Error('Failed to initialize external payment');
      }
      
      // Store temp registration ID if provided
      if (result.details?.tempRegistrationId) {
        localStorage.setItem('temp_registration_id', result.details.tempRegistrationId);
      }
      
      // Redirect to payment page
      window.location.href = result.details.redirectUrl;
      return result;
    } catch (error) {
      await handleError(error, { planId });
      setIsProcessing(false);
      return { success: false, error };
    }
  };

  /**
   * Handle card payment form submission
   */
  const handleSubmit = async (e: React.FormEvent, cardData: {
    cardNumber: string;
    cardholderName: string;
    expiryDate: string;
    cvv: string;
  }) => {
    e.preventDefault();
    
    const { cardNumber, cardholderName, expiryDate, cvv } = cardData;
    
    // Validate form data
    if (!cardNumber || !cardholderName || !expiryDate || !cvv) {
      toast.error('נא למלא את כל פרטי התשלום');
      return;
    }
    
    // Process expiry date
    const [expiryMonth, expiryYear] = expiryDate.split('/');
    
    // Create token data object
    const tokenData: TokenData = {
      token: `sim_${Date.now()}`,
      lastFourDigits: cardNumber.replace(/\s/g, '').slice(-4),
      expiryMonth,
      expiryYear: `20${expiryYear}`,
      cardholderName
    };
    
    // Process the card payment
    return handleCardPayment(tokenData);
  };

  return {
    isProcessing,
    paymentError,
    plan,
    checkForRecovery,
    handleSubmit,
    handleCardPayment,
    handleExternalPayment,
    isRecovering,
    sessionId
  };
}
