
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { initializeCardcomRedirect, redirectToCardcomPayment } from '@/lib/payment/cardcom-service'; 
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface RedirectPaymentButtonProps {
  planId: string;
  amount: number;
  userEmail?: string;
  fullName?: string;
  variant?: 'default' | 'outline' | 'secondary' | 'destructive' | 'ghost' | 'link';
  className?: string;
  children?: React.ReactNode;
}

export const RedirectPaymentButton: React.FC<RedirectPaymentButtonProps> = ({
  planId,
  amount,
  userEmail = '',
  fullName = '',
  variant = 'default',
  className = '',
  children
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      // Initialize CardCom redirect payment
      const response = await initializeCardcomRedirect({
        planId,
        amount,
        userEmail,
        fullName
      });
      
      // Store payment reference in session storage
      sessionStorage.setItem('payment_data', JSON.stringify({
        reference: response.reference,
        lowProfileCode: response.lowProfileCode,
        planId,
        timestamp: new Date().toISOString(),
        status: 'initialized'
      }));

      // Redirect to CardCom payment page
      if (response.url) {
        redirectToCardcomPayment(response.url);
      } else {
        throw new Error('חסרה כתובת מעבר לתשלום');
      }
    } catch (error) {
      console.error('Error initializing redirect payment:', error);
      toast.error(error instanceof Error ? error.message : 'שגיאה באתחול תשלום');
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      className={className}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          מעבר לתשלום...
        </>
      ) : (
        children || 'מעבר לתשלום'
      )}
    </Button>
  );
};

export default RedirectPaymentButton;
