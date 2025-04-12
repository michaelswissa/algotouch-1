
import React, { useState, useEffect } from 'react';
import CardcomOpenFields from './CardcomOpenFields';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

interface OpenFieldsPaymentFormProps {
  planId: string;
  onPaymentComplete: (transactionId: string) => void;
  onPaymentStart?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

// Define exact plan prices in ILS (including commas for display)
const PLAN_PRICES = {
  monthly: { price: 371, displayPrice: 371, name: 'חודשי' },
  annual: { price: 3371, displayPrice: 3371, name: 'שנתי' },
  vip: { price: 13121, displayPrice: 13121, name: 'VIP לכל החיים' }
};

const OpenFieldsPaymentForm: React.FC<OpenFieldsPaymentFormProps> = ({ 
  planId, 
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel 
}) => {
  const [processingPayment, setProcessingPayment] = useState(false);

  // Load the 3DS script when the component mounts
  useEffect(() => {
    const cardcom3DSScript = document.createElement('script');
    const time = new Date().getTime();
    cardcom3DSScript.setAttribute('src', `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${time}`);
    document.head.appendChild(cardcom3DSScript);
    
    // Clean up the script when the component unmounts
    return () => {
      if (document.head.contains(cardcom3DSScript)) {
        document.head.removeChild(cardcom3DSScript);
      }
    };
  }, []);

  // Add this useEffect to check for payment status from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get('success');
    const lowProfileId = sessionStorage.getItem('payment_lowProfileId');
    
    if (success === 'true' && lowProfileId) {
      // We have a successful callback
      console.log('Payment callback detected with lowProfileId:', lowProfileId);
      
      // Payment verification will be handled by usePaymentStatus
      // This is just for logging purposes
    }
  }, []);

  const handleSuccess = (transactionId: string) => {
    setProcessingPayment(false);
    onPaymentComplete(transactionId);
  };

  const handleError = (error: string) => {
    setProcessingPayment(false);
    if (onError) onError(error);
  };

  const handlePaymentStart = () => {
    setProcessingPayment(true);
    if (onPaymentStart) onPaymentStart();
  };

  // Get plan details to display in the UI
  const planInfo = PLAN_PRICES[planId as keyof typeof PLAN_PRICES] || PLAN_PRICES.monthly;
  
  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          {planId === 'monthly' 
            ? 'הרשמה למנוי חודשי עם חודש ניסיון חינם' 
            : planId === 'annual' 
              ? 'הרשמה למנוי שנתי עם חיסכון של 25%' 
              : 'רכישת מנוי VIP לכל החיים'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {planId === 'monthly' 
              ? 'המנוי כולל חודש ניסיון חינם. החיוב הראשון של 371 ₪ יתבצע רק לאחר 30 יום.'
              : planId === 'annual' 
                ? 'המנוי השנתי במחיר 3,371 ₪ משקף חיסכון של 25% בהשוואה למנוי חודשי.' 
                : 'מנוי VIP הוא תשלום חד פעמי של 13,121 ₪ המעניק גישה לכל החיים.'}
          </AlertDescription>
        </Alert>
        
        <CardcomOpenFields 
          planId={planId}
          planName={planInfo.name}
          amount={planInfo.displayPrice} 
          onSuccess={handleSuccess}
          onError={handleError}
          onCancel={onCancel}
          onPaymentStart={handlePaymentStart}
        />
      </CardContent>
    </Card>
  );
};

export default OpenFieldsPaymentForm;
