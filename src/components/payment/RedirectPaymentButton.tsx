
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CardComRedirectService } from '@/services/payment/CardComRedirectService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { RegistrationService } from '@/services/registration/RegistrationService';

interface RedirectPaymentButtonProps {
  planId: string;
  amount: number;
  className?: string;
  children?: React.ReactNode;
}

const RedirectPaymentButton: React.FC<RedirectPaymentButtonProps> = ({
  planId,
  amount,
  className,
  children
}) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleRedirectPayment = async () => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      PaymentLogger.log('Starting redirect payment process', { planId, amount });
      
      // Step 1: Get and validate registration data
      const registrationData = RegistrationService.getValidRegistrationData();
      if (!registrationData) {
        toast.error('מידע הרשמה חסר או לא תקין');
        throw new Error('מידע הרשמה חסר או לא תקין');
      }
      
      PaymentLogger.log('Registration data loaded', { 
        email: registrationData.email,
        hasUserData: !!registrationData.userData
      });
      
      // Step 2: Create user account first
      PaymentLogger.log('Creating/validating user account before payment');
      const { success, user, error } = await RegistrationService.createUserAccount(registrationData);
      
      if (!success || !user) {
        toast.error(error || 'שגיאה ביצירת חשבון המשתמש');
        throw new Error(error || 'שגיאה ביצירת חשבון המשתמש');
      }
      
      PaymentLogger.log('User account ready for payment', { userId: user.id });
      
      // Step 3: Initialize payment redirect
      const fullName = `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim();
      const email = registrationData.email;
      
      const { url } = await CardComRedirectService.initializeRedirect({
        planId,
        amount,
        userEmail: email,
        fullName,
        userId: user.id
      });
      
      // Step 4: Redirect to payment page
      CardComRedirectService.redirectToPayment(url);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה באתחול התשלום';
      PaymentLogger.error('Payment redirect error:', error);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleRedirectPayment} 
      disabled={isLoading}
      className={className}
    >
      {isLoading ? (
        <span className="flex items-center">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד בקשה...
        </span>
      ) : (
        children || 'מעבר לעמוד התשלום'
      )}
    </Button>
  );
};

export default RedirectPaymentButton;
