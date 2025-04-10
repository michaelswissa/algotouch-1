
import { TokenData } from '@/types/payment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Process payment for an existing user
 */
export async function handleExistingUserPayment(
  userId: string, 
  planId: string, 
  tokenData: TokenData, 
  operationType: number,
  planDetails: any
) {
  try {
    const { data, error } = await supabase.functions.invoke('direct-payment', {
      body: {
        token: tokenData.token,
        userId,
        planId,
        operationType,
        amount: operationType !== 3 ? getAmountForPlan(planId) : 0
      }
    });
    
    if (error) {
      console.error('Payment processing error:', error);
      throw new Error(`שגיאה בעיבוד התשלום: ${error.message}`);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'אירעה שגיאה בעיבוד התשלום');
    }
    
    toast.success(`הרשמה לתוכנית ${planDetails[planId].name} בוצעה בהצלחה!`);
    return data;
  } catch (error: any) {
    console.error('Error in handleExistingUserPayment:', error);
    throw error;
  }
}

/**
 * Register a new user with their payment information
 */
export async function registerNewUser(registrationData: any, tokenData: TokenData) {
  try {
    const { data, error } = await supabase.functions.invoke('register-user', {
      body: {
        registrationData: {
          ...registrationData,
          paymentToken: {
            token: tokenData.token || tokenData.lastFourDigits,
            expiry: tokenData.expiryMonth && tokenData.expiryYear 
              ? `${tokenData.expiryMonth}/${tokenData.expiryYear}` 
              : undefined,
            lastFourDigits: tokenData.lastFourDigits,
            cardholderName: tokenData.cardholderName
          }
        }
      }
    });
    
    if (error) {
      console.error('Registration error:', error);
      throw new Error(`שגיאה בתהליך ההרשמה: ${error.message}`);
    }
    
    if (!data || !data.success) {
      throw new Error(data?.error || 'אירעה שגיאה בתהליך ההרשמה');
    }
    
    // Clear registration data as it's been processed
    sessionStorage.removeItem('registration_data');
    
    return data;
  } catch (error: any) {
    console.error('Error in registerNewUser:', error);
    throw error;
  }
}

/**
 * Verify a payment from an external payment gateway
 */
export async function verifyExternalPayment(lowProfileId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('cardcom-payment/verify-payment', {
      body: {
        lowProfileId
      }
    });
    
    if (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: `שגיאה באימות התשלום: ${error.message}`
      };
    }
    
    if (!data || !data.success) {
      return {
        success: false,
        error: data?.error || 'אירעה שגיאה באימות התשלום'
      };
    }
    
    return data;
  } catch (error: any) {
    console.error('Error in verifyExternalPayment:', error);
    return {
      success: false,
      error: error.message || 'שגיאה לא ידועה באימות התשלום'
    };
  }
}

/**
 * Recover a failed payment session
 */
export async function recoverPaymentSession(sessionId: string) {
  try {
    const { data, error } = await supabase.functions.invoke('recover-payment-session', {
      body: { sessionId }
    });
    
    if (error) {
      console.error('Payment session recovery error:', error);
      return null;
    }
    
    if (!data || !data.success) {
      return null;
    }
    
    return data.paymentSession;
  } catch (error: any) {
    console.error('Error in recoverPaymentSession:', error);
    return null;
  }
}

/**
 * Helper function to get the amount for a plan
 */
function getAmountForPlan(planId: string): number {
  switch (planId) {
    case 'monthly':
      return 9900; // 99.00 shekels
    case 'annual':
      return 89900; // 899.00 shekels
    case 'vip':
      return 349900; // 3499.00 shekels
    default:
      return 9900;
  }
}
