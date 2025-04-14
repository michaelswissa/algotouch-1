
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

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
  const { fullName, email } = useSubscriptionContext();

  return (
    <div className="space-y-6">
      <Alert>
        <AlertCircle className="h-5 w-5" />
        <AlertDescription>
          מערכת התשלומים נמצאת בתהליך שדרוג. אנא נסה שוב מאוחר יותר.
        </AlertDescription>
      </Alert>
      
      <div className="flex justify-start">
        <Button 
          variant="outline" 
          onClick={onBack} 
          className="mx-auto"
        >
          חזור
        </Button>
      </div>
    </div>
  );
};

export default PaymentSection;
