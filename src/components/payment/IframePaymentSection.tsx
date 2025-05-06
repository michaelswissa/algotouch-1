
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentStatusEnum } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { CardComService } from '@/services/payment/CardComService';
import { StorageService } from '@/services/storage/StorageService';
import { useAuth } from '@/contexts/auth';
import SecurityNote from './SecurityNote';
import type { ContractData } from '@/lib/contracts/contract-validation-service';

interface IframePaymentSectionProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

export const IframePaymentSection: React.FC<IframePaymentSectionProps> = ({
  planId,
  onPaymentComplete,
  onBack
}) => {
  const { user } = useAuth();
  const [isInitializing, setIsInitializing] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusEnum>(PaymentStatusEnum.INITIALIZING);
  const [iframeUrl, setIframeUrl] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Effect to initialize payment
  useEffect(() => {
    const initializePayment = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        
        // Get contract data for customer details
        const contractData = StorageService.get<ContractData>('contract_data');
        if (!contractData) {
          throw new Error('נדרש למלא את פרטי החוזה לפני ביצוע תשלום');
        }

        if (!contractData.email || !contractData.fullName) {
          throw new Error('חסרים פרטי לקוח בחוזה');
        }
        
        // Validate phone and idNumber are present
        if (!contractData.phone || !contractData.idNumber) {
          throw new Error('חסרים פרטי טלפון או תעודת זהות בחוזה');
        }

        const operationType = planId === 'monthly' ? 'token_only' : 'payment';
        
        // Initialize payment via CardCom service
        const sessionData = await CardComService.initializePayment({
          planId,
          userId: user?.id || null,
          email: contractData.email,
          fullName: contractData.fullName,
          phone: contractData.phone,
          idNumber: contractData.idNumber,
          operationType
        });
        
        PaymentLogger.log('Payment initialized successfully', {
          sessionId: sessionData.sessionId,
          lowProfileCode: sessionData.lowProfileCode,
          hasUrl: !!sessionData.iframeUrl
        });
        
        // Set state with payment session data
        setSessionId(sessionData.sessionId);
        setIframeUrl(sessionData.iframeUrl || '');
        setPaymentStatus(PaymentStatusEnum.IDLE);
        setIsInitializing(false);
        
      } catch (error) {
        PaymentLogger.error('Payment initialization error:', error);
        const errorMessage = error instanceof Error ? error.message : 'שגיאה באתחול התשלום';
        setError(errorMessage);
        setPaymentStatus(PaymentStatusEnum.FAILED);
        setIsInitializing(false);
        toast.error(errorMessage);
      }
    };
    
    initializePayment();
  }, [planId, user?.id]);
  
  // Effect to listen for iframe messages
  useEffect(() => {
    if (!sessionId) return;
    
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      
      const data = event.data;
      PaymentLogger.log('Received message from iframe:', data);
      
      if (data?.type === 'cardcom-ok') {
        PaymentLogger.log('Payment completed successfully');
        setPaymentStatus(PaymentStatusEnum.SUCCESS);
        toast.success('התשלום הושלם בהצלחה');
        onPaymentComplete();
      }
      
      if (data?.type === 'cardcom-fail') {
        PaymentLogger.log('Payment failed');
        setPaymentStatus(PaymentStatusEnum.FAILED);
        setError('התשלום נכשל. אנא נסה שנית או פנה לתמיכה.');
        toast.error('התשלום נכשל');
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [sessionId, onPaymentComplete]);

  const handleRetry = () => {
    setIsInitializing(true);
    setError(null);
    setPaymentStatus(PaymentStatusEnum.INITIALIZING);
    
    // Reload the page to reinitialize the payment
    window.location.reload();
  };

  // Render loading state
  if (isInitializing) {
    return (
      <Card>
        <CardContent className="pt-6 pb-8">
          <div className="flex flex-col items-center justify-center space-y-4 min-h-[300px]">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-lg">מתחבר למערכת התשלום...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Render error state
  if (error || paymentStatus === PaymentStatusEnum.FAILED) {
    return (
      <Card>
        <CardContent className="pt-6 pb-8">
          <div className="flex flex-col items-center justify-center space-y-4 min-h-[300px]">
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center max-w-lg mx-auto">
              <h3 className="text-red-700 dark:text-red-400 font-medium text-lg mb-2">שגיאה באתחול התשלום</h3>
              <p className="text-red-600 dark:text-red-300 mb-4">{error || 'אירעה שגיאה בהתחברות למערכת הסליקה'}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={handleRetry} variant="default">
                  נסה שנית
                </Button>
                {onBack && (
                  <Button onClick={onBack} variant="outline">
                    <ArrowLeft className="ml-2 h-4 w-4 -rotate-180" />
                    חזרה
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Render iframe
  return (
    <Card>
      <CardContent className="pt-6 pb-8">
        <div className="space-y-6">
          <div className="w-full rounded-md overflow-hidden border relative" style={{ minHeight: '430px' }}>
            {iframeUrl && (
              <iframe
                src={iframeUrl}
                style={{ border: 0, width: '100%', height: '430px' }}
                title="CardCom Payment"
                sandbox="allow-scripts allow-forms allow-same-origin"
              />
            )}
          </div>
          
          <SecurityNote />
          
          {onBack && (
            <div className="flex justify-center mt-6">
              <Button onClick={onBack} variant="outline">
                <ArrowLeft className="ml-2 h-4 w-4 -rotate-180" />
                חזרה
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default IframePaymentSection;
