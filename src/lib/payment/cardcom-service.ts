
import { supabase } from '@/integrations/supabase/client';

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
}) {
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

export async function checkPaymentStatus(lowProfileCode: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke('cardcom-status', {
    body: { lowProfileCode }
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.success || false;
}
