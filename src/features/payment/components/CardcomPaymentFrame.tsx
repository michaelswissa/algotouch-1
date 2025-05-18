
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { createTokenizationUrl } from '../services/cardcomService';
import { Shield, ShieldCheck, CreditCard } from 'lucide-react';

interface CardcomPaymentFrameProps {
  amount: number;
  planId: string;
  userId?: string;
  successUrl: string;
  errorUrl: string;
  webhookUrl: string;
  terminalNumber: number;
  apiName: string;
  email?: string;
  fullName?: string;
  operation?: 'ChargeOnly' | 'ChargeAndCreateToken' | 'CreateTokenOnly';
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  onBack?: () => void;
}

const CardcomPaymentFrame: React.FC<CardcomPaymentFrameProps> = ({
  amount,
  planId,
  userId,
  successUrl,
  errorUrl,
  webhookUrl,
  terminalNumber,
  apiName,
  email,
  fullName,
  operation,
  onSuccess,
  onError,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [iframeHeight, setIframeHeight] = useState(650);
  
  // Handle responsive iframe height
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIframeHeight(700);
      } else {
        setIframeHeight(650);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize payment on component mount
  useEffect(() => {
    initializePayment();
  }, []);

  // Function to initialize payment
  const initializePayment = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await createTokenizationUrl({
        terminalNumber,
        apiName,
        amount,
        successUrl,
        errorUrl,
        webhookUrl,
        productName: `Subscription - ${planId.charAt(0).toUpperCase() + planId.slice(1)}`,
        returnValue: userId || 'guest-payment',
        language: 'he',
        operation: operation || 'ChargeAndCreateToken',
        fullName,
        email
      });

      if (!result.success) {
        throw new Error(result.error || 'שגיאה ביצירת עמוד התשלום');
      }

      setPaymentUrl(result.url || null);
    } catch (err: any) {
      console.error('Payment initialization error:', err);
      setError(err.message || 'שגיאה בהגדרת תהליך התשלום');
      
      if (onError) {
        onError(err instanceof Error ? err : new Error(err.message || 'Unknown error'));
      }
      
      toast.error('שגיאה בהגדרת תהליך התשלום');
    } finally {
      setIsLoading(false);
    }
  };

  // Listen for messages from the iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('Received message from iframe:', event.data);
      
      if (event.data?.type === 'cardcom-paid') {
        console.log('Payment successful:', event.data.details);
        toast.success('התשלום התקבל בהצלחה!');
        
        if (onSuccess) {
          onSuccess(event.data.details);
        }
      } else if (event.data?.type === 'cardcom-error') {
        console.error('Payment error:', event.data.message);
        toast.error('שגיאה בתהליך התשלום: ' + (event.data.message || 'אנא נסה שנית'));
        
        if (onError) {
          onError(new Error(event.data.message || 'Payment failed'));
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSuccess, onError]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-10">
          <Spinner size="lg" />
          <p className="mt-4 text-center">מתחבר למערכת הסליקה...</p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <div className="text-red-500 mb-4 text-center">
            <p>אירעה שגיאה בהתחברות למערכת הסליקה</p>
            <p className="text-sm text-muted-foreground mt-2">{error}</p>
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Button onClick={initializePayment} className="w-full">
              נסה שנית
            </Button>
            {onBack && (
              <Button onClick={onBack} variant="outline" className="w-full">
                חזרה
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!paymentUrl) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-6">
          <p className="text-red-500">לא ניתן ליצור קישור לתשלום</p>
          <Button onClick={initializePayment} className="mt-4">
            נסה שנית
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <CardContent className="p-0">
      <div className="relative">
        {/* Payment form title */}
        <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">טופס תשלום מאובטח</h3>
          </div>
          
          {/* Security badges */}
          <div className="flex flex-wrap gap-3 items-center mb-2">
            <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs border border-green-200 dark:border-green-900/30">
              <ShieldCheck className="h-3 w-3" />
              <span>SSL מאובטח</span>
            </div>
            <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-900/30">
              <CreditCard className="h-3 w-3" />
              <span>תשלום מוצפן</span>
            </div>
            <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-200 dark:border-purple-900/30">
              <ShieldCheck className="h-3 w-3" />
              <span>PCI DSS</span>
            </div>
          </div>
        </div>
        
        {/* Enhanced iframe container */}
        <div className="relative bg-gradient-to-b from-primary/5 to-transparent p-4 sm:p-6">
          <div className="relative rounded-lg overflow-hidden border-2 border-primary/20 shadow-xl hover:shadow-2xl transition-shadow duration-300">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/5 pointer-events-none"></div>
            <iframe 
              src={paymentUrl}
              width="100%"
              height={iframeHeight}
              frameBorder="0"
              title="Cardcom Payment Form"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </CardContent>
  );
};

export default CardcomPaymentFrame;
