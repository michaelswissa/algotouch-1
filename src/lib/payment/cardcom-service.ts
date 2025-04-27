
import { supabase } from '@/integrations/supabase/client';
import { PaymentSessionData } from '@/components/payment/types/payment';

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

  if (error || !data?.success) {
    throw new Error(error?.message || data?.message || 'Failed to initialize payment');
  }

  return data.data;
}

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

  if (error || !data?.success) {
    throw new Error(error?.message || data?.message || 'Failed to initialize payment redirect');
  }

  return data.data;
}

export async function checkPaymentStatus(lowProfileCode: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('cardcom-status', {
    body: { lowProfileCode }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.success || false;
}

export function redirectToCardcomPayment(url: string): void {
  if (!url) {
    throw new Error('Missing redirect URL');
  }
  
  window.location.href = url;
}
