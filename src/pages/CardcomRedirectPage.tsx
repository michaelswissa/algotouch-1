
import React from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingPage } from '@/components/ui/spinner';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { PaymentRedirectError } from '@/components/payment/PaymentRedirectError';
import { PaymentRedirectSuccess } from '@/components/payment/PaymentRedirectSuccess';

export default function CardcomRedirectPage() {
  const location = useLocation();
  // Parse URL search params to get relevant data
  const searchParams = new URLSearchParams(location.search);
  const lowProfileId = searchParams.get('LowProfileId');
  
  // Use our custom hook to handle payment verification
  const { isLoading, error, paymentDetails } = usePaymentVerification({ lowProfileId });

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return <PaymentRedirectError error={error} />;
  }

  return <PaymentRedirectSuccess paymentDetails={paymentDetails} />;
}
