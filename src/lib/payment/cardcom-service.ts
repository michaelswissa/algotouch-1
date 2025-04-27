import { supabase } from '@/integrations/supabase/client';
import { PaymentSessionData, CardComPaymentResponse, PaymentError } from '@/components/payment/types/payment';
import { CARDCOM_CONFIG } from './cardcom-config';

/**
 * Initialize a CardCom payment session for iframe-based payments
 */
export async function initializeCardcomPayment({
  planId,
  amount,
  userEmail,
  fullName,
}: {
  planId: string;
  amount: number;
  userEmail: string;
  fullName: string;
}): Promise<PaymentSessionData> {
  try {
    const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
      body: {
        planId,
        amount,
        operation: planId === 'monthly' ? 'ChargeAndCreateToken' : 'ChargeOnly',
        invoiceInfo: {
          fullName,
          email: userEmail,
        },
        redirectUrls: {
          success: `${window.location.origin}/subscription/success`,
          failed: `${window.location.origin}/subscription/failed`
        }
      }
    });

    if (error) {
      console.error('CardCom payment initialization error:', error);
      throw new Error(error.message || 'שגיאה באתחול תהליך התשלום');
    }
    
    if (!data?.success) {
      console.error('CardCom payment initialization failed:', data?.message);
      throw new Error(data?.message || 'שגיאה באתחול תהליך התשלום');
    }

    return data.data;
  } catch (error) {
    console.error('Exception during payment initialization:', error);
    throw new Error(error instanceof Error ? error.message : 'שגיאה באתחול תהליך התשלום');
  }
}

/**
 * Initialize a redirect-based payment flow with CardCom
 */
export async function initializeCardcomRedirect({
  planId,
  amount,
  userEmail,
  fullName,
}: {
  planId: string;
  amount: number;
  userEmail: string;
  fullName: string;
}): Promise<PaymentSessionData & { url: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('cardcom-redirect', {
      body: {
        planId,
        amount,
        invoiceInfo: {
          fullName,
          email: userEmail,
        },
        redirectUrls: {
          success: `${window.location.origin}/subscription/success`,
          failed: `${window.location.origin}/subscription/failed`
        }
      }
    });

    if (error) {
      console.error('CardCom redirect initialization error:', error);
      throw new Error(error.message || 'שגיאה באתחול דף התשלום');
    }
    
    if (!data?.success) {
      console.error('CardCom redirect initialization failed:', data?.message);
      throw new Error(data?.message || 'שגיאה באתחול דף התשלום');
    }

    if (!data.data?.url) {
      throw new Error('חסרה כתובת מעבר לתשלום');
    }

    return data.data;
  } catch (error) {
    console.error('Exception during redirect initialization:', error);
    throw new Error(error instanceof Error ? error.message : 'שגיאה באתחול דף התשלום');
  }
}

/**
 * Check the status of a payment transaction
 */
export async function checkPaymentStatus(lowProfileCode: string): Promise<boolean> {
  if (!lowProfileCode) {
    console.error('Missing lowProfileCode for status check');
    return false;
  }
  
  try {
    const { data, error } = await supabase.functions.invoke('cardcom-status', {
      body: { lowProfileCode }
    });

    if (error) {
      console.error('Error checking payment status:', error);
      throw new Error(error.message || 'שגיאה בבדיקת סטטוס התשלום');
    }

    return data?.success || false;
  } catch (error) {
    console.error('Exception during payment status check:', error);
    return false;
  }
}

/**
 * Redirect to CardCom payment page
 */
export function redirectToCardcomPayment(url: string): void {
  if (!url) {
    throw new Error('חסרה כתובת מעבר לתשלום');
  }
  
  window.location.href = url;
}

/**
 * Format CardCom error response
 */
export function handleCardcomError(error: any): PaymentError {
  if (typeof error === 'string') {
    return {
      code: 'UNKNOWN',
      message: error
    };
  }
  
  if (error.ResponseCode) {
    return {
      code: `CARDCOM_${error.ResponseCode}`,
      message: error.Description || 'שגיאה לא ידועה מ-Cardcom'
    };
  }
  
  return {
    code: 'UNKNOWN',
    message: error.message || 'שגיאה לא ידועה'
  };
}
