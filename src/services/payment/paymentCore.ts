
/**
 * Core Payment Service
 * Central logic for handling payments across different contexts
 */

import { supabase } from '@/lib/supabase-client';
import { toast } from 'sonner';
import { TokenData } from '@/types/payment';

// Define common types
export interface PaymentResult {
  success: boolean;
  sessionId?: string;
  userId?: string;
  transactionId?: string;
  error?: string;
  errorCode?: string;
  details?: any;
}

export interface PaymentOptions {
  planId: string;
  userId?: string;
  email?: string;
  operationType?: number;
  tokenData?: TokenData;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  returnUrl?: string;
}

/**
 * Core payment processing function
 */
export async function processPayment(options: PaymentOptions): Promise<PaymentResult> {
  try {
    const {
      planId,
      userId,
      email,
      operationType = 2, // Default: Charge and create token
      tokenData,
      metadata = {}
    } = options;
    
    // Log the payment attempt
    console.debug('Processing payment:', { planId, userId: userId || 'anonymous', operationType });
    
    // For direct card payment
    if (tokenData) {
      return await processCardPayment({ ...options, tokenData });
    }
    
    // For external payment flow (Cardcom iframe, etc)
    return await initializeExternalPayment(options);
  } catch (error: any) {
    console.error('Payment processing error:', error);
    
    // Standard error format
    return {
      success: false,
      error: error.message || 'Unknown payment error',
      errorCode: error.code || 'PAYMENT_FAILED',
      details: error
    };
  }
}

/**
 * Process a card payment with provided token data
 */
async function processCardPayment(options: PaymentOptions & { tokenData: TokenData }): Promise<PaymentResult> {
  const { planId, userId, tokenData, operationType } = options;
  
  try {
    // Call the payment function
    const { data, error } = await supabase.functions.invoke('cardcom-payment', {
      body: {
        planId,
        tokenData,
        userId,
        operationType,
        metadata: options.metadata || {}
      }
    });
    
    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.message || 'Payment processing failed');
    }
    
    return {
      success: true,
      sessionId: data.sessionId,
      transactionId: data.transactionId,
      userId: data.userId || userId
    };
  } catch (error: any) {
    console.error('Card payment error:', error);
    
    return {
      success: false,
      error: error.message || 'Card payment failed',
      errorCode: error.code || 'CARD_PAYMENT_FAILED',
      details: error
    };
  }
}

/**
 * Initialize an external payment process (redirect flow)
 */
async function initializeExternalPayment(options: PaymentOptions): Promise<PaymentResult> {
  const { planId, userId, email, returnUrl, metadata } = options;
  
  try {
    // Create a payment session for an external payment flow
    const { data, error } = await supabase.functions.invoke('cardcom-iframe-redirect', {
      body: {
        planId,
        userId,
        email,
        returnUrl,
        metadata: metadata || {}
      }
    });
    
    if (error) throw error;
    
    if (!data?.success || !data?.url) {
      throw new Error(data?.message || 'Failed to initialize payment');
    }
    
    // Return success with redirect URL
    return {
      success: true,
      sessionId: data.sessionId,
      details: {
        redirectUrl: data.url,
        tempRegistrationId: data.tempRegistrationId
      }
    };
  } catch (error: any) {
    console.error('External payment initialization error:', error);
    
    return {
      success: false,
      error: error.message || 'Failed to initialize external payment',
      errorCode: error.code || 'EXTERNAL_PAYMENT_FAILED',
      details: error
    };
  }
}

/**
 * Verify a payment session after completion
 */
export async function verifyPaymentSession(sessionId: string): Promise<PaymentResult> {
  try {
    const { data, error } = await supabase.functions.invoke('verify-payment-session', {
      body: { sessionId }
    });
    
    if (error) throw error;
    
    if (!data?.success) {
      throw new Error(data?.message || 'Payment verification failed');
    }
    
    return {
      success: true,
      sessionId,
      transactionId: data.transactionId,
      userId: data.userId
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Payment verification failed',
      errorCode: 'VERIFICATION_FAILED',
      details: error
    };
  }
}

/**
 * Create a subscription from a successful payment
 */
export async function createSubscription(
  userId: string, 
  planId: string, 
  paymentDetails: any
): Promise<boolean> {
  try {
    const { error } = await supabase.from('subscriptions').insert({
      user_id: userId,
      plan_id: planId,
      status: 'active',
      payment_method: paymentDetails.paymentMethod || 'card',
      payment_details: paymentDetails
    });
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating subscription:', error);
    return false;
  }
}

/**
 * Get available subscription plans
 */
export function getSubscriptionPlans() {
  return {
    monthly: {
      id: 'monthly',
      name: 'חודשי',
      price: '₪371',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      info: 'חודש ראשון ללא תשלום'
    },
    annual: {
      id: 'annual',
      name: 'שנתי',
      price: '₪3,371',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      info: 'חיוב מיידי לכל השנה'
    },
    vip: {
      id: 'vip',
      name: 'VIP',
      price: '₪13,121',
      description: 'גישה לכל החיים בתשלום חד פעמי',
      info: 'חיוב מיידי חד פעמי'
    }
  };
}
