
import { supabase } from '@/integrations/supabase/client';

export interface PaymentParams {
  userId: string;
  planId: string;
  fullName: string;
  email: string;
  phone?: string;
  amount: number;
  currency?: string;
  language?: string;
  description?: string;
}

export interface PaymentResponse {
  success: boolean;
  paymentUrl?: string;
  orderId?: string;
  error?: string;
}

/**
 * Initiates a payment through Cardcom payment gateway
 */
export async function initiatePayment(
  params: PaymentParams
): Promise<PaymentResponse> {
  try {
    // Get current origin for success/failure URLs
    const origin = window.location.origin;
    
    // Call the Cardcom payment edge function
    const { data, error } = await supabase.functions.invoke('cardcom-payment', {
      body: {
        ...params,
        successUrl: `${origin}/subscription/success?orderId=${Date.now()}`,
        failureUrl: `${origin}/subscription/failure`,
      },
    });

    if (error) {
      console.error('Error initiating payment:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate payment'
      };
    }

    return data as PaymentResponse;
  } catch (error) {
    console.error('Exception initiating payment:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }
}

/**
 * Redirects the user to the payment page
 */
export function redirectToPayment(paymentUrl: string): void {
  window.location.href = paymentUrl;
}

/**
 * Initiates payment and redirects if successful
 */
export async function payWithCardcom(params: PaymentParams): Promise<PaymentResponse> {
  const response = await initiatePayment(params);
  
  if (response.success && response.paymentUrl) {
    redirectToPayment(response.paymentUrl);
  }
  
  return response;
}
