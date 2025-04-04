
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSubscription } from '@/hooks/useSubscription';
import { useAuth } from '@/contexts/auth';
import CardcomPaymentProcessor from '@/components/payment/CardcomPaymentProcessor';
import { useRegistrationData } from '@/hooks/useRegistrationData';

const PaymentSection = () => {
  const { user } = useAuth();
  const { selectedPlan } = useSubscription();
  const { registrationData } = useRegistrationData();
  const [isLoading, setIsLoading] = useState(false);

  // Get price from selected plan
  const price = selectedPlan?.price || 299;
  const planName = selectedPlan?.title || 'תכנית חודשית';
  const planId = selectedPlan?.id || 'monthly';

  // Handle payment success
  const handlePaymentSuccess = () => {
    setIsLoading(false);
    // Navigate is handled by the redirect URL from Cardcom
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    setIsLoading(false);
    console.error('Payment error:', error);
  };

  // Get user information from registration data
  const fullName = registrationData?.fullName || `${user?.user_metadata?.first_name || ''} ${user?.user_metadata?.last_name || ''}`.trim();
  const email = registrationData?.email || user?.email || '';
  const phone = registrationData?.phone || user?.phone || '';

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl">פרטי תשלום</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">תכנית:</span>
            <span>{planName}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="font-medium">סכום לתשלום:</span>
            <span className="font-bold">{price} ₪</span>
          </div>
          <div className="flex justify-between">
            <span className="font-medium">שיטת תשלום:</span>
            <span>כרטיס אשראי</span>
          </div>

          <CardcomPaymentProcessor
            planId={planId}
            amount={price}
            planName={planName}
            fullName={fullName}
            email={email}
            phone={phone}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentSection;
