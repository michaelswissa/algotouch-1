
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { toast } from 'sonner';
import OpenFieldsPaymentForm from '@/components/payment/OpenFieldsPaymentForm';
import PaymentForm from '@/components/payment/PaymentForm';

interface PaymentSectionProps {
  selectedPlan: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  selectedPlan,
  onPaymentComplete,
  onBack
}) => {
  const { user } = useAuth();
  const { fullName, email } = useSubscriptionContext();
  const [paymentMethod, setPaymentMethod] = useState<'direct' | 'openfields'>('openfields');
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Check for registration data in session storage on component mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        setRegistrationData(JSON.parse(storedData));
      } catch (error) {
        console.error('Error parsing registration data:', error);
      }
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    const success = params.get('success');
    
    if (error === 'true') {
      toast.error('התשלום נכשל, אנא נסה שנית');
    } else if (success === 'true') {
      toast.success('התשלום התקבל בהצלחה!');
      onPaymentComplete();
    }
  }, [onPaymentComplete]);

  // User is considered "valid" if they are either:
  // 1. Logged in (authenticated) OR
  // 2. In the registration process with valid data in sessionStorage
  const isValidUser = user || registrationData;

  if (!isValidUser) {
    return (
      <Alert className="max-w-lg mx-auto">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          יש להיות מחובר כדי להמשיך לתשלום. אנא התחבר או הירשם.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {paymentMethod === 'direct' ? (
        <PaymentForm 
          planId={selectedPlan}
          onPaymentComplete={onPaymentComplete}
        />
      ) : (
        <div className="space-y-6">
          <Card className="max-w-lg mx-auto" dir="rtl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                <CardTitle>תשלום</CardTitle>
              </div>
              <CardDescription>
                {selectedPlan === 'monthly' 
                  ? 'הירשם למנוי חודשי עם חודש ניסיון חינם' 
                  : selectedPlan === 'annual' 
                    ? 'הירשם למנוי שנתי עם 25% הנחה' 
                    : 'הירשם למנוי VIP לכל החיים'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {selectedPlan === 'monthly' 
                    ? 'המנוי כולל חודש ניסיון חינם. החיוב הראשון יתבצע רק לאחר 30 יום.'
                    : selectedPlan === 'annual' 
                      ? 'המנוי השנתי משקף חיסכון של 3 חודשים בהשוואה למנוי חודשי.' 
                      : 'מנוי VIP הוא תשלום חד פעמי המעניק גישה לכל החיים.'}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
          
          <OpenFieldsPaymentForm 
            planId={selectedPlan}
            onPaymentComplete={onPaymentComplete}
            onCancel={() => setPaymentMethod('direct')}
          />
          
          <div className="flex justify-start">
            <Button variant="outline" onClick={onBack} className="mx-auto">
              חזור
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentSection;
