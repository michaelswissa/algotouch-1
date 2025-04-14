
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

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
  onCancel
}) => {
  const { user } = useAuth();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [lowProfileId, setLowProfileId] = useState('');
  const [registrationData, setRegistrationData] = useState<any>(null);
  
  // Get plan details
  const plans = getSubscriptionPlans();
  const selectedPlan = planId === 'monthly' ? plans.monthly : 
                      planId === 'annual' ? plans.annual : 
                      planId === 'vip' ? plans.vip : plans.monthly;

  useEffect(() => {
    // Check for registration data
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      try {
        setRegistrationData(JSON.parse(storedData));
      } catch (err) {
        console.error('Error parsing registration data:', err);
      }
    }
  }, []);

  const handlePaymentInitiation = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      if (onPaymentStart) onPaymentStart();
      
      const email = user?.email || registrationData?.email || '';
      const fullName = registrationData?.userData?.firstName && registrationData?.userData?.lastName
        ? `${registrationData.userData.firstName} ${registrationData.userData.lastName}` 
        : 'Customer';

      // Create payment session
      const { data, error } = await supabase.functions.invoke('cardcom-openfields', {
        body: { 
          planId,
          amount: selectedPlan.price,
          email,
          fullName,
          successRedirectUrl: `${window.location.origin}/subscription?success=true&planId=${planId}`,
          errorRedirectUrl: `${window.location.origin}/subscription?error=true`
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data || !data.url) {
        throw new Error('Failed to create payment session');
      }

      // Save lowProfileId for later status checks
      if (data.lowProfileId) {
        setLowProfileId(data.lowProfileId);
        // Store in localStorage to help with status checking after redirect
        localStorage.setItem('payment_pending_id', data.lowProfileId);
        localStorage.setItem('payment_pending_plan', planId);
      }

      // Open payment page
      setPaymentUrl(data.url);
      window.location.href = data.url;
      
    } catch (err) {
      setIsProcessing(false);
      const errorMessage = err instanceof Error ? err.message : 'אירעה שגיאה בתהליך התשלום';
      console.error('Payment initiation error:', errorMessage);
      
      if (onError) {
        onError(errorMessage);
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="border rounded-md p-4 bg-muted/40">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-semibold">{selectedPlan.name}</h3>
            <p className="text-sm text-muted-foreground">{selectedPlan.description}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">{selectedPlan.price} ₪</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Button 
          onClick={handlePaymentInitiation}
          className="w-full" 
          disabled={isProcessing}
        >
          {isProcessing ? 'מעבד...' : 'המשך לתשלום'}
        </Button>
        
        {onCancel && (
          <Button 
            variant="outline" 
            onClick={onCancel}
            className="w-full mt-2" 
            disabled={isProcessing}
          >
            חזרה
          </Button>
        )}
      </div>
      
      <div className="text-center text-xs text-muted-foreground">
        <p>התשלום מאובטח באמצעות Cardcom</p>
      </div>
    </div>
  );
};

export default CardcomOpenFields;
