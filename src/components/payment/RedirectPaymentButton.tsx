
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CardComRedirectService } from '@/services/payment/CardComRedirectService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { StorageService } from '@/services/storage/StorageService';

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
      
      // Get registration data without creating user
      const registrationData = StorageService.getRegistrationData();
      if (!registrationData || !registrationData.email) {
        toast.error('מידע הרשמה חסר או לא תקין');
        throw new Error('מידע הרשמה חסר או לא תקין');
      }
      
      PaymentLogger.log('Registration data loaded', { 
        email: registrationData.email,
        hasUserData: !!registrationData.userData
      });
      
      // Prepare user information for the payment without creating account
      const fullName = `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim();
      const email = registrationData.email;
      
      // Store registration intent in storage for later use after payment
      StorageService.storeRegistrationIntent({ planId, amount });
      
      // Initialize payment redirect
      const { url, lowProfileCode, reference } = await CardComRedirectService.initializeRedirect({
        planId,
        amount,
        userEmail: email,
        fullName,
        // Pass userId only if already created, otherwise leave it undefined
        userId: registrationData.userId
      });
      
      // Store payment session information
      StorageService.updatePaymentData({
        sessionId: reference,
        lowProfileCode: lowProfileCode,
        reference: reference,
        status: 'pending'
      });
      
      // Redirect to payment page
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
