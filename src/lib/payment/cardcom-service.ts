
import { supabase } from '@/integrations/supabase/client';
import { PaymentSessionData, CardOwnerDetails, PaymentError, CardComPaymentResponse } from '@/components/payment/types/payment';
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
    const { data, error } = await supabase.functions.invoke('cardcom-payment', {
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
    // Direct CardCom integration to avoid 404 errors
    // The LowProfile API endpoint at CardCom
    const createLowProfileUrl = 'https://secure.cardcom.solutions/api/v11/LowProfile/Create';
    const terminalNumber = CARDCOM_CONFIG.terminalNumber;
    const apiName = CARDCOM_CONFIG.apiName;
    
    // Generate a unique reference for this payment
    const reference = `${planId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    
    // Prepare request to CardCom
    const lowProfilePayload = {
      TerminalNumber: terminalNumber,
      ApiName: apiName,
      Amount: amount,
      SuccessRedirectUrl: `${window.location.origin}/subscription/success`,
      FailedRedirectUrl: `${window.location.origin}/subscription/failed`,
      ReturnValue: reference,
      Operation: planId === 'monthly' ? 'ChargeAndCreateToken' : 'ChargeOnly',
      Language: 'he',
      ISOCoinId: 1, // 1 for ILS
      UIDefinition: {
        IsHideCardOwnerName: false,
        CardOwnerNameValue: fullName,
        IsHideCardOwnerEmail: false,
        CardOwnerEmailValue: userEmail,
        IsCardOwnerEmailRequired: true,
        IsHideCardOwnerPhone: false,
        IsCardOwnerPhoneRequired: true
      },
      Document: {
        Name: fullName || userEmail || "Customer",
        Email: userEmail,
        Comments: `Subscription: ${planId}`,
        IsVatFree: false
      }
    };
    
    console.log('Sending direct request to CardCom:', lowProfilePayload);
    
    // Call CardCom API directly
    const response = await fetch(createLowProfileUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lowProfilePayload),
    });
    
    const responseData = await response.json();
    console.log('CardCom direct response:', responseData);
    
    if (responseData.ResponseCode !== 0 || !responseData.LowProfileId) {
      throw new Error(responseData.Description || "Failed to create payment page");
    }
    
    // Return payment session data
    return {
      lowProfileCode: responseData.LowProfileId,
      sessionId: reference,
      terminalNumber,
      cardcomUrl: 'https://secure.cardcom.solutions',
      reference,
      url: responseData.Url // This should be the correctly formatted URL
    };
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
