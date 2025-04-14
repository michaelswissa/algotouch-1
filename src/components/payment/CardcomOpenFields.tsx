
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { supabase } from '@/integrations/supabase/client';

interface CardcomOpenFieldsProps {
  planId: string;
  onPaymentComplete: (transactionId: string) => void;
  onPaymentStart?: () => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  onPaymentComplete,
  onPaymentStart,
  onError,
  onCancel,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const plans = getSubscriptionPlans();
  
  // Get the selected plan
  const selectedPlan = planId === 'annual' 
    ? plans.annual 
    : planId === 'vip' 
      ? plans.vip 
      : plans.monthly;

  const handleSubmitPayment = async () => {
    try {
      if (onPaymentStart) {
        onPaymentStart();
      }
      
      setIsLoading(true);
      
      // Here we would normally integrate with Cardcom's OpenFields API
      // For now, we'll simulate a successful payment
      
      // Simulated API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate successful transaction
      const mockTransactionId = `txn_${Math.random().toString(36).substring(2, 15)}`;
      toast.success('התשלום התקבל בהצלחה!');
      
      onPaymentComplete(mockTransactionId);
    } catch (error: any) {
      console.error('Error processing payment:', error);
      const errorMessage = error.message || 'חלה שגיאה בעיבוד התשלום';
      
      if (onError) {
        onError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Plan summary */}
      <div className="bg-muted/50 p-4 rounded-md">
        <h3 className="font-medium mb-2">פרטי מנוי</h3>
        <p className="text-sm text-muted-foreground mb-2">{selectedPlan.name}: {selectedPlan.description}</p>
        <p className="font-medium">₪{selectedPlan.price.toLocaleString()}</p>
      </div>
      
      {/* Payment form */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="cardholderName">שם בעל הכרטיס</Label>
          <Input id="cardholderName" placeholder="ישראל ישראלי" className="mt-1" disabled={isLoading} />
        </div>
        
        {/* Simulated OpenFields iframe placeholders */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="cardNumber">מספר כרטיס</Label>
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded border border-input mt-1 flex items-center px-3 text-sm text-muted-foreground">
              •••• •••• •••• ••••
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="expiryDate">תוקף</Label>
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded border border-input mt-1 flex items-center px-3 text-sm text-muted-foreground">
                MM/YY
              </div>
            </div>
            <div>
              <Label htmlFor="cvv">CVV</Label>
              <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded border border-input mt-1 flex items-center px-3 text-sm text-muted-foreground">
                •••
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Form buttons */}
      <div className="flex justify-between">
        {onCancel && (
          <Button 
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            בטל
          </Button>
        )}
        <Button 
          className="w-full ml-2" 
          onClick={handleSubmitPayment}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner className="mr-2 h-4 w-4" />
              מעבד תשלום...
            </>
          ) : (
            planId === 'monthly' ? 'התחל תקופת ניסיון' : 'שלם עכשיו'
          )}
        </Button>
      </div>
      
      {/* Security message */}
      <p className="text-xs text-center text-muted-foreground">
        התשלום מאובטח ומוצפן. פרטי הכרטיס לא נשמרים במערכת.
      </p>
    </div>
  );
};

export default CardcomOpenFields;
