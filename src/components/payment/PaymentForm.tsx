
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import PlanSummary from './PlanSummary';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { useNavigate } from 'react-router-dom';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete, onBack }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const navigate = useNavigate();
  
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;

  const handlePayNow = () => {
    setIsLoading(true);
    try {
      // Redirect to the iframe payment page
      navigate(`/payment/iframe/${planId}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה לא ידועה';
      toast.error(errorMessage);
      setIsLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-primary" />
          <CardTitle>פרטי תשלום</CardTitle>
        </div>
        <CardDescription>
          בחרת ב{plan.name} - השלם את התשלום באמצעות כרטיס אשראי
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <PlanSummary 
          planName={plan.name} 
          planId={plan.id}
          price={plan.price}
          displayPrice={plan.displayPrice}
          description={plan.description} 
          hasTrial={plan.hasTrial}
          freeTrialDays={plan.freeTrialDays}
        />
        
        <div className="rounded-md bg-muted p-4 text-center">
          <p className="text-sm">להמשך תהליך התשלום, אנא לחץ על הכפתור למטה.</p>
          <p className="text-xs text-muted-foreground mt-2">התשלום מאובטח באמצעות מערכת קארדקום</p>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        <Button 
          type="button" 
          className="w-full" 
          onClick={handlePayNow}
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
              מעבר לדף התשלום...
            </span>
          ) : (
            <span className="flex items-center">
              <ExternalLink className="mr-2 h-4 w-4" />
              מעבר לדף התשלום המאובטח
            </span>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground">
          {plan.hasTrial 
            ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
            : 'החיוב יבוצע מיידית'}
        </p>
        
        {onBack && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="mt-2"
            disabled={isLoading}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default PaymentForm;
