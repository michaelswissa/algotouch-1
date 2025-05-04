
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertCircle, RefreshCcw } from 'lucide-react';
import { PaymentStatusEnum } from '@/types/payment';
import { getSubscriptionPlans } from './utils/paymentHelpers';
import PlanSummary from './PlanSummary';
import SecurityNote from './SecurityNote';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { StorageService } from '@/services/storage/StorageService';
import type { ContractData } from '@/lib/contracts/contract-validation-service';

interface IframePaymentSectionProps {
  planId: string;
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

const IframePaymentSection: React.FC<IframePaymentSectionProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusEnum>(PaymentStatusEnum.IDLE);
  
  const { user } = useAuth();
  
  const plans = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? plans.annual 
    : planId === 'vip' 
      ? plans.vip 
      : plans.monthly;

  // Initialize iframe when component mounts
  useEffect(() => {
    initializePaymentIframe();
  }, []);

  // Check payment status periodically
  useEffect(() => {
    if (!sessionId || paymentStatus !== PaymentStatusEnum.IDLE) return;
    
    const checkStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cardcom-status', {
          body: { sessionId }
        });
        
        if (error) {
          PaymentLogger.error('Error checking payment status:', error);
          return;
        }
        
        if (data?.data?.status === 'success') {
          PaymentLogger.log('Payment completed successfully');
          setPaymentStatus(PaymentStatusEnum.SUCCESS);
          toast.success('התשלום הושלם בהצלחה!');
          
          if (onPaymentComplete) {
            onPaymentComplete();
          }
        } else if (data?.data?.status === 'failed') {
          PaymentLogger.log('Payment failed');
          setPaymentStatus(PaymentStatusEnum.FAILED);
          setError('התשלום נכשל. אנא נסה שנית או צור קשר עם התמיכה.');
        }
      } catch (e) {
        PaymentLogger.error('Error in status check:', e);
      }
    };
    
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [sessionId, paymentStatus, onPaymentComplete]);

  // Initialize payment iframe
  const initializePaymentIframe = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setPaymentStatus(PaymentStatusEnum.INITIALIZING);
      
      // Get contract data from storage
      const contractData = StorageService.get<ContractData>('contract_data');
      if (!contractData) {
        throw new Error('נדרש למלא את פרטי החוזה לפני ביצוע תשלום');
      }

      // Validate all required fields
      if (!contractData.email || !contractData.fullName) {
        throw new Error('חסרים פרטי לקוח בחוזה (נדרש שם מלא ואימייל)');
      }
      
      if (!contractData.phone || !contractData.idNumber) {
        throw new Error('חסרים פרטי לקוח בחוזה (נדרש מספר טלפון ומספר ת.ז.)');
      }
      
      PaymentLogger.log('Initializing payment iframe for plan', { 
        planId,
        email: contractData.email,
        fullName: contractData.fullName,
        hasPhone: Boolean(contractData.phone),
        hasIdNumber: Boolean(contractData.idNumber)
      });
      
      // Determine operation type based on plan
      const operationType = planId === 'monthly' ? '3' : planId === 'annual' ? '2' : '1';
      
      // Call our Supabase Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-iframe', {
        body: {
          planId,
          userId: user?.id || null,
          email: contractData.email,
          fullName: contractData.fullName,
          phone: contractData.phone,
          idNumber: contractData.idNumber,
          operationType
        }
      });
      
      if (error) {
        PaymentLogger.error('Error from cardcom-iframe function:', error);
        throw new Error(`Failed to initialize payment: ${error.message}`);
      }
      
      if (!data || !data.success) {
        const errorMessage = data?.message || 'Unknown error from payment service';
        PaymentLogger.error('Payment initialization failed:', errorMessage);
        throw new Error(errorMessage);
      }
      
      // Check for required fields in response
      if (!data.data?.iframeUrl) {
        PaymentLogger.error('No iframe URL in response', data);
        throw new Error('No iframe URL provided by payment service');
      }
      
      if (!data.data?.sessionId) {
        PaymentLogger.error('No session ID in response', data);
        throw new Error('No session ID provided by payment service');
      }
      
      // Store received data
      setIframeUrl(data.data.iframeUrl);
      setSessionId(data.data.sessionId);
      setPaymentStatus(PaymentStatusEnum.IDLE);
      
      PaymentLogger.log('Payment iframe initialized successfully', { 
        sessionId: data.data.sessionId,
        iframeUrl: data.data.iframeUrl
      });
      
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'שגיאה באתחול התשלום';
      PaymentLogger.error('Payment iframe initialization error:', error);
      
      setError(errorMessage);
      setPaymentStatus(PaymentStatusEnum.FAILED);
      toast.error(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle iframe loading
  const handleIframeLoad = () => {
    PaymentLogger.log('Iframe loaded successfully');
  };

  // Handle iframe error
  const handleIframeError = () => {
    PaymentLogger.error('Iframe loading error');
    if (!error) {
      setError('שגיאה בטעינת מסגרת התשלום');
    }
  };

  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>תשלום עבור {plan.name}</CardTitle>
        <CardDescription>
          השלם את התשלום באמצעות כרטיס אשראי
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
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>מתחבר למערכת התשלום...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={initializePaymentIframe} variant="outline">
              <RefreshCcw className="mr-2 h-4 w-4" />
              נסה שנית
            </Button>
          </div>
        ) : iframeUrl ? (
          <>
            {/* Development only - URL display for debugging */}
            {import.meta.env.DEV && (
              <div className="bg-slate-100 p-2 rounded text-xs mb-2 overflow-hidden">
                <div className="font-semibold">Debug - Iframe URL:</div>
                <div className="truncate">{iframeUrl}</div>
              </div>
            )}
            
            <div className="rounded-lg border overflow-hidden relative w-full pt-[120%] md:pt-[75%]">
              <iframe 
                src={iframeUrl}
                className="absolute top-0 left-0 w-full h-full"
                title="CardCom Payment"
                frameBorder="0"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
              ></iframe>
            </div>
            
            <SecurityNote />
          </>
        ) : (
          <div className="text-center p-4">
            <p className="text-red-500">לא ניתן לטעון את ממשק התשלום</p>
            <Button onClick={initializePaymentIframe} className="mt-2">
              נסה שנית
            </Button>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex flex-col gap-2">
        {onBack && !isLoading && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            disabled={isLoading || paymentStatus === PaymentStatusEnum.PROCESSING}
            className="w-full"
          >
            חזור
          </Button>
        )}
        
        <p className="text-xs text-center text-muted-foreground">
          {plan.hasTrial 
            ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
            : 'החיוב יבוצע מיידית עם השלמת הפרטים'}
        </p>
      </CardFooter>
    </Card>
  );
};

export default IframePaymentSection;
