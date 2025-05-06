
import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth/useAuth'; 
import { StorageService } from '@/services/storage/StorageService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentStatusEnum } from '@/types/payment';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { CardComService } from '@/services/payment/CardComService';
import type { ContractData } from '@/lib/contracts/contract-validation-service';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

interface IframePaymentSectionProps {
  planId: string;
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

export const IframePaymentSection: React.FC<IframePaymentSectionProps> = ({ 
  planId, 
  onPaymentComplete,
  onBack 
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { handlePaymentComplete } = useSubscriptionContext();
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusEnum>(PaymentStatusEnum.IDLE);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Check URL params if we're coming from a redirect
  const searchParams = useSearchParams()[0];
  const location = useLocation();
  
  // Check parameters as soon as the component loads - to handle redirects from CardCom
  useEffect(() => {
    if (location.search && searchParams) {
      PaymentLogger.log('Detected URL parameters, checking if redirect from CardCom', { search: location.search });
      
      // Handle redirect parameters
      const redirectParams = CardComService.handleRedirectParameters(searchParams);
      
      if (redirectParams.sessionId) {
        setSessionId(redirectParams.sessionId);
        
        // If successful response code
        if (redirectParams.status === 'success') {
          PaymentLogger.log('Payment success detected from URL parameters');
          setPaymentStatus(PaymentStatusEnum.SUCCESS);
          
          // Update status in database
          const updatePaymentStatus = async () => {
            try {
              await supabase.functions.invoke('cardcom-status', {
                body: { 
                  sessionId: redirectParams.sessionId,
                  forceUpdate: true,
                  status: 'success'
                }
              });
            } catch (err) {
              PaymentLogger.error('Failed to update payment status', err);
            }
          };
          
          updatePaymentStatus();
          
          if (onPaymentComplete) {
            setTimeout(() => {
              onPaymentComplete();
            }, 1000);
          }
        } else if (redirectParams.status === 'failed') {
          setError('התשלום נדחה');
          setPaymentStatus(PaymentStatusEnum.FAILED);
        }
        
        return; // Don't continue to create a new payment if we detected parameters
      }
    }
    
    // Determine if we're using token_only mode (for monthly plans)
    const operationType = planId === 'monthly' ? 'token_only' : 'payment';
    
    // Initialize the payment iframe when component mounts
    const initializePaymentIframe = async () => {
      try {
        setIsLoading(true);
        setError(null);
        setPaymentStatus(PaymentStatusEnum.INITIALIZING);
        
        // Get contract data from storage - contains customer info
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

        PaymentLogger.log('Initializing payment iframe for plan', { 
          planId, 
          email: contractData.email,
          fullName: contractData.fullName,
          hasPhone: Boolean(contractData.phone),
          hasIdNumber: Boolean(contractData.idNumber),
          operationType
        });
        
        // Map operation type to CardCom format
        const cardcomOperation = operationType === 'token_only' ? 'CreateTokenOnly' : 'ChargeOnly';
        
        // Call the CardCom iframe initialization edge function
        const { data, error } = await supabase.functions.invoke('cardcom-iframe', {
          body: {
            planId,
            userId: user?.id || null,
            email: contractData.email,
            fullName: contractData.fullName,
            phone: contractData.phone,
            idNumber: contractData.idNumber,
            operationType: cardcomOperation
          }
        });
        
        if (error) {
          PaymentLogger.error('Error from cardcom-iframe function:', error);
          throw new Error(`Failed to initialize payment: ${error.message}`);
        }
        
        if (!data?.success || !data?.data) {
          throw new Error(data?.message || 'Invalid response from payment service');
        }
        
        // Find the iframe URL from different possible properties
        const url = data.data.url || data.data.iframeUrl || data.data.Url;
        
        if (!url) {
          throw new Error('No iframe URL provided in the response');
        }
        
        // Set the iframe URL and session ID
        setIframeUrl(url);
        setSessionId(data.data.sessionId);
        setPaymentStatus(PaymentStatusEnum.IDLE);
        
        PaymentLogger.log('Payment iframe initialized successfully', {
          iframeUrl: url,
          sessionId: data.data.sessionId,
          lowProfileId: data.data.lowProfileId || data.data.LowProfileId
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'אירעה שגיאה בהתחברות למערכת התשלומים';
        PaymentLogger.error('Payment iframe initialization error:', error);
        setError(errorMessage);
        setPaymentStatus(PaymentStatusEnum.FAILED);
        toast.error(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    initializePaymentIframe();
  }, [planId, user?.id, location.search, searchParams, onPaymentComplete]);
  
  // Handle iframe messages from CardCom and our redirect pages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      PaymentLogger.log('Received message event:', {
        origin: event.origin,
        ourOrigin: window.location.origin,
        data: event.data
      });
      
      // First, check if this is a message from our payment redirect pages
      if (event.origin === window.location.origin) {
        // Handle messages from our redirect pages
        if (event.data?.type === 'cardcom-ok') {
          PaymentLogger.log('Received cardcom-ok message from redirect page', event.data);
          setPaymentStatus(PaymentStatusEnum.SUCCESS);
          toast.success('התשלום בוצע בהצלחה!');
          
          // Move to next step in subscription flow
          if (onPaymentComplete) {
            onPaymentComplete();
          } else {
            // Alternative: Call handlePaymentComplete from subscription context
            handlePaymentComplete?.();
            // Or navigate to success page
            navigate('/subscription/success', { replace: true });
          }
        } 
        else if (event.data?.type === 'cardcom-fail') {
          PaymentLogger.log('Received cardcom-fail message from redirect page', event.data);
          setPaymentStatus(PaymentStatusEnum.FAILED);
          setError(event.data?.message || 'התשלום נכשל');
          toast.error('התשלום נכשל');
        }
        return;
      }
      
      // For messages from CardCom domains
      if (event.origin.includes('cardcom.solutions')) {
        PaymentLogger.log('Received message from CardCom iframe:', event.data);
        
        try {
          // Try to parse the message if it's a string
          const data = typeof event.data === 'string' 
            ? JSON.parse(event.data) 
            : event.data;
            
          if (data.action === 'HandleSubmit' && data.data?.IsSuccess) {
            setPaymentStatus(PaymentStatusEnum.SUCCESS);
            toast.success('התשלום בוצע בהצלחה!');
            
            if (onPaymentComplete) {
              onPaymentComplete();
            }
          } else if (data.action === 'HandleError') {
            setPaymentStatus(PaymentStatusEnum.FAILED);
            setError(data.message || 'התשלום נכשל');
            toast.error(data.message || 'התשלום נכשל');
          }
        } catch (err) {
          PaymentLogger.error('Error processing CardCom iframe message:', err);
        }
      }
    };
    
    // Add message event listener
    window.addEventListener('message', handleMessage);
    
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onPaymentComplete, navigate, handlePaymentComplete]);
  
  // Poll for payment status updates
  useEffect(() => {
    if (!sessionId || paymentStatus !== PaymentStatusEnum.IDLE) {
      return;
    }
    
    const checkPaymentStatus = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('cardcom-status', {
          body: { sessionId }
        });
        
        if (error) {
          PaymentLogger.error('Error checking payment status:', error);
          return;
        }
        
        if (data?.data?.status === 'success') {
          setPaymentStatus(PaymentStatusEnum.SUCCESS);
          toast.success('התשלום בוצע בהצלחה!');
          
          if (onPaymentComplete) {
            onPaymentComplete();
          }
        } else if (data?.data?.status === 'failed') {
          setPaymentStatus(PaymentStatusEnum.FAILED);
          setError('התשלום נדחה');
          toast.error('התשלום נכשל');
        }
      } catch (err) {
        PaymentLogger.error('Error in payment status check:', err);
      }
    };
    
    // Check immediately and then every 5 seconds
    checkPaymentStatus();
    const interval = setInterval(checkPaymentStatus, 5000);
    
    return () => clearInterval(interval);
  }, [sessionId, paymentStatus, onPaymentComplete]);
  
  // Handle iframe load events
  const handleIframeLoad = () => {
    PaymentLogger.log('Iframe loaded successfully');
    setIsLoading(false);
  };
  
  // Handle iframe errors
  const handleIframeError = () => {
    PaymentLogger.error('Iframe failed to load');
    setError('נכשל בטעינת טופס התשלום');
    setIsLoading(false);
  };
  
  // Handle retry button click
  const handleRetry = () => {
    setError(null);
    setPaymentStatus(PaymentStatusEnum.IDLE);
    setIsLoading(true);
    window.location.reload();
  };

  // Render different states
  if (paymentStatus === PaymentStatusEnum.SUCCESS) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>התשלום בוצע בהצלחה</CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <div className="flex flex-col items-center justify-center space-y-3">
            <CheckCircle className="h-16 w-16 text-green-500" />
            <p className="text-xl font-medium">תודה!</p>
            <p>התשלום שלך התקבל בהצלחה.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={onPaymentComplete}>המשך</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>תשלום מאובטח</CardTitle>
        <CardDescription>הזן את פרטי התשלום בטופס המאובטח</CardDescription>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>מתחבר למערכת התשלומים...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <p className="text-destructive">{error}</p>
            <Button onClick={handleRetry}>נסה שנית</Button>
          </div>
        ) : iframeUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border overflow-hidden relative w-full" style={{ height: '500px' }}>
              <iframe
                ref={iframeRef}
                src={iframeUrl}
                title="CardCom Payment"
                className="absolute top-0 left-0 w-full h-full"
                style={{ border: 'none' }}
                allow="payment"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
                onLoad={handleIframeLoad}
                onError={handleIframeError}
              ></iframe>
            </div>
            <div className="bg-muted/50 p-4 rounded-lg text-center text-sm text-muted-foreground">
              <p>🔒 מערכת התשלום מאובטחת לחלוטין. פרטי כרטיס האשראי שלך אינם נשמרים במערכת.</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin" />
            <p>טוען את טופס התשלום...</p>
          </div>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-between">
        {onBack && (
          <Button variant="outline" onClick={onBack} disabled={isLoading || paymentStatus === PaymentStatusEnum.PROCESSING}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            חזרה
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default IframePaymentSection;
