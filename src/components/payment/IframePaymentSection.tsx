
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth/useAuth';
import { CardOwnerDetails, PaymentStatusEnum } from '@/types/payment';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { StorageService } from '@/services/storage/StorageService';
import { useNavigate } from 'react-router-dom';
import CardNumberFrame from './iframes/CardNumberFrame';
import CVVFrame from './iframes/CVVFrame';
import ReCaptchaFrame from './iframes/ReCaptchaFrame';
import { usePaymentForm } from '@/hooks/payment/usePaymentForm';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PlanSummary from './PlanSummary';
import { getSubscriptionPlans } from './utils/paymentHelpers';

interface IframePaymentSectionProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

// Define the CardCom3DS interface to work with the global object
declare global {
  interface Window {
    cardcom3DS: {
      validateFields: () => boolean;
      doPayment: (lowProfileCode: string) => void;
      init: (options: any) => void;
    };
  }
}

const IframePaymentSection: React.FC<IframePaymentSectionProps> = ({
  planId,
  onPaymentComplete,
  onBack
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCardFieldsReady, setIsCardFieldsReady] = useState(false);
  const [fieldsLoaded, setFieldsLoaded] = useState({
    cardNumber: false,
    cvv: false,
    reCaptcha: false
  });
  
  // Payment session state
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatusEnum>(PaymentStatusEnum.IDLE);
  const [paymentSession, setPaymentSession] = useState({
    lowProfileCode: '',
    sessionId: '',
    terminalNumber: '',
    reference: '',
    cardcomUrl: 'https://secure.cardcom.solutions'
  });
  
  // Get plan details
  const planDetails = getSubscriptionPlans();
  const plan = planId === 'annual' 
    ? planDetails.annual 
    : planId === 'vip' 
      ? planDetails.vip 
      : planDetails.monthly;
  
  // Form state
  const { formData, errors, handleChange, validateForm, setFormData } = usePaymentForm();
  
  // Load the CardCom 3DS script
  useEffect(() => {
    const scriptId = 'cardcom-3ds-script';
    
    if (window.cardcom3DS) {
      PaymentLogger.log('CardCom 3DS.js script already loaded');
      return;
    }
    
    if (document.getElementById(scriptId)) {
      PaymentLogger.log('CardCom 3DS.js script already loading');
      return;
    }

    PaymentLogger.log('Loading CardCom 3DS.js script');
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://secure.cardcom.solutions/External/OpenFields/3DS.js?v=${Date.now()}`;
    script.async = true;
    
    script.onload = () => {
      PaymentLogger.log('CardCom 3DS.js script loaded successfully');
    };
    
    script.onerror = () => {
      PaymentLogger.error('Failed to load CardCom 3DS.js script');
      toast.error('שגיאה בטעינת מערכת התשלומים, אנא רענן את העמוד ונסה שוב');
    };

    document.body.appendChild(script);
    
    // No cleanup needed for the script as it should persist for the entire application lifecycle
  }, []);
  
  // Initialize payment
  const initializePayment = useCallback(async () => {
    try {
      setIsLoading(true);
      setPaymentStatus(PaymentStatusEnum.INITIALIZING);

      const contractData = StorageService.get<any>('contract_data');
      if (!contractData) {
        throw new Error('נדרש למלא את פרטי החוזה לפני ביצוע תשלום');
      }

      if (!contractData.email || !contractData.fullName) {
        throw new Error('חסרים פרטי לקוח בחוזה');
      }

      // Determine operation type based on plan
      const operationType = planId === 'monthly' ? 'token_only' : 'payment';

      // Initialize payment session
      const sessionData = await CardComService.initializePayment({
        planId,
        userId: user?.id || null,
        email: contractData.email,
        fullName: contractData.fullName,
        operationType
      });

      setPaymentSession({
        lowProfileCode: sessionData.lowProfileId,
        sessionId: sessionData.sessionId,
        terminalNumber: sessionData.terminalNumber,
        reference: sessionData.reference,
        cardcomUrl: sessionData.cardcomUrl || 'https://secure.cardcom.solutions'
      });
      
      // Pre-fill form with data from contract
      setFormData({
        ...formData,
        cardOwnerName: contractData.fullName || '',
        cardOwnerEmail: contractData.email || '',
        cardOwnerPhone: contractData.phone || '',
        cardOwnerId: contractData.identityNumber || ''
      });

      setPaymentStatus(PaymentStatusEnum.IDLE);
      setIsLoading(false);
      
      return sessionData;
    } catch (error) {
      console.error('Error initializing payment:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה באתחול התשלום';
      toast.error(errorMessage);
      setPaymentStatus(PaymentStatusEnum.FAILED);
      setIsLoading(false);
      return null;
    }
  }, [planId, user?.id, formData, setFormData]);
  
  // Handle field loading
  const handleFieldLoad = useCallback((fieldName: keyof typeof fieldsLoaded) => {
    setFieldsLoaded(prev => ({
      ...prev,
      [fieldName]: true
    }));
  }, []);
  
  // Check if all fields are loaded
  useEffect(() => {
    if (fieldsLoaded.cardNumber && fieldsLoaded.cvv && fieldsLoaded.reCaptcha) {
      setIsCardFieldsReady(true);
    }
  }, [fieldsLoaded]);
  
  // Initialize CardCom fields once payment session and script are ready
  useEffect(() => {
    if (
      paymentSession.lowProfileCode && 
      paymentSession.terminalNumber && 
      window.cardcom3DS && 
      isCardFieldsReady && 
      !isInitialized
    ) {
      const operationType = planId === 'monthly' ? '3' : '1'; // 3=CreateTokenOnly, 1=ChargeOnly
      
      try {
        PaymentLogger.log('Initializing CardCom fields', { 
          lowProfileCode: paymentSession.lowProfileCode,
          terminalNumber: paymentSession.terminalNumber
        });
        
        window.cardcom3DS.init({
          LowProfileCode: paymentSession.lowProfileCode,
          TerminalNumber: paymentSession.terminalNumber,
          Operation: operationType,
          Language: 'he'
        });
        
        setIsInitialized(true);
        PaymentLogger.log('CardCom fields initialized successfully');
      } catch (error) {
        PaymentLogger.error('Error initializing CardCom fields:', error);
        toast.error('שגיאה באתחול שדות התשלום, אנא רענן את העמוד ונסה שוב');
      }
    }
  }, [paymentSession.lowProfileCode, paymentSession.terminalNumber, isCardFieldsReady, isInitialized, planId]);
  
  // Initialize payment on component mount
  useEffect(() => {
    initializePayment();
  }, [initializePayment]);
  
  // Listen for payment message events from CardCom
  useEffect(() => {
    const handlePaymentMessages = (event: MessageEvent) => {
      // Validate event origin
      if (!event.origin.includes('cardcom.solutions') && 
          !event.origin.includes('localhost') && 
          !event.origin.includes(window.location.origin)) {
        return;
      }
      
      try {
        const data = event.data;
        
        if (typeof data === 'object' && data !== null) {
          // Handle transaction response
          if (data.action === 'transactionResponse') {
            PaymentLogger.log('Received transaction response:', data);
            
            if (data.success) {
              setPaymentStatus(PaymentStatusEnum.SUCCESS);
              toast.success('התשלום הושלם בהצלחה!');
              
              // Wait a moment before calling onPaymentComplete
              setTimeout(() => {
                onPaymentComplete();
              }, 1000);
            } else {
              setPaymentStatus(PaymentStatusEnum.FAILED);
              toast.error(data.message || 'העסקה נכשלה, אנא נסה שנית');
              setIsSubmitting(false);
            }
          }
          
          // Handle validation response
          if (data.action === 'validationResponse') {
            PaymentLogger.log('Received validation response:', data);
          }
        }
      } catch (error) {
        PaymentLogger.error('Error handling payment message:', error);
      }
    };
    
    window.addEventListener('message', handlePaymentMessages);
    
    return () => {
      window.removeEventListener('message', handlePaymentMessages);
    };
  }, [onPaymentComplete]);
  
  // Handle payment submission
  const handleSubmitPayment = useCallback(() => {
    if (isSubmitting || !window.cardcom3DS || !paymentSession.lowProfileCode) {
      return;
    }
    
    const isValid = validateForm();
    if (!isValid) {
      toast.error('אנא מלא את כל השדות הנדרשים');
      return;
    }
    
    try {
      setIsSubmitting(true);
      setPaymentStatus(PaymentStatusEnum.PROCESSING);
      
      // Validate CardCom fields
      const isCardcomValid = window.cardcom3DS.validateFields();
      
      if (!isCardcomValid) {
        toast.error('אנא וודא שפרטי כרטיס האשראי מולאו כראוי');
        setIsSubmitting(false);
        setPaymentStatus(PaymentStatusEnum.IDLE);
        return;
      }
      
      // Submit payment
      PaymentLogger.log('Submitting payment', { lowProfileCode: paymentSession.lowProfileCode });
      window.cardcom3DS.doPayment(paymentSession.lowProfileCode);
      
      // Set timeout to check payment status if we don't get a response
      setTimeout(() => {
        if (paymentStatus === PaymentStatusEnum.PROCESSING) {
          checkPaymentStatus();
        }
      }, 5000);
    } catch (error) {
      PaymentLogger.error('Error submitting payment:', error);
      toast.error('שגיאה בשליחת התשלום, אנא נסה שוב');
      setIsSubmitting(false);
      setPaymentStatus(PaymentStatusEnum.FAILED);
    }
  }, [isSubmitting, paymentSession.lowProfileCode, validateForm, paymentStatus]);
  
  // Check payment status
  const checkPaymentStatus = useCallback(async () => {
    if (!paymentSession.lowProfileCode || !paymentSession.sessionId) {
      return;
    }
    
    try {
      const statusResult = await CardComService.checkPaymentStatus(
        paymentSession.lowProfileCode,
        paymentSession.sessionId
      );
      
      PaymentLogger.log('Payment status check result:', statusResult);
      
      if (statusResult.success && statusResult.status === 'success') {
        setPaymentStatus(PaymentStatusEnum.SUCCESS);
        toast.success('התשלום הושלם בהצלחה!');
        onPaymentComplete();
      } else if (paymentStatus === PaymentStatusEnum.PROCESSING) {
        setPaymentStatus(PaymentStatusEnum.FAILED);
        setIsSubmitting(false);
        toast.error(statusResult.message || 'העסקה נכשלה, אנא נסה שנית');
      }
    } catch (error) {
      PaymentLogger.error('Error checking payment status:', error);
    }
  }, [paymentSession.lowProfileCode, paymentSession.sessionId, paymentStatus, onPaymentComplete]);
  
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
        
        {paymentStatus !== PaymentStatusEnum.SUCCESS && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cardOwnerName">שם בעל הכרטיס</Label>
                <Input
                  id="cardOwnerName"
                  name="cardOwnerName"
                  placeholder="ישראל ישראלי"
                  value={formData.cardOwnerName}
                  onChange={handleChange}
                  disabled={isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING}
                  className={errors.cardOwnerName ? 'border-red-500' : ''}
                />
                {errors.cardOwnerName && (
                  <p className="text-xs text-red-500">{errors.cardOwnerName}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardOwnerId">תעודת זהות</Label>
                <Input
                  id="cardOwnerId"
                  name="cardOwnerId"
                  placeholder="123456789"
                  value={formData.cardOwnerId}
                  onChange={handleChange}
                  disabled={isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING}
                  className={errors.cardOwnerId ? 'border-red-500' : ''}
                />
                {errors.cardOwnerId && (
                  <p className="text-xs text-red-500">{errors.cardOwnerId}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardOwnerEmail">דוא"ל</Label>
                <Input
                  id="cardOwnerEmail"
                  name="cardOwnerEmail"
                  type="email"
                  placeholder="israel@example.com"
                  value={formData.cardOwnerEmail}
                  onChange={handleChange}
                  disabled={isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING}
                  className={errors.cardOwnerEmail ? 'border-red-500' : ''}
                />
                {errors.cardOwnerEmail && (
                  <p className="text-xs text-red-500">{errors.cardOwnerEmail}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="cardOwnerPhone">טלפון</Label>
                <Input
                  id="cardOwnerPhone"
                  name="cardOwnerPhone"
                  placeholder="0501234567"
                  value={formData.cardOwnerPhone}
                  onChange={handleChange}
                  disabled={isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING}
                  className={errors.cardOwnerPhone ? 'border-red-500' : ''}
                />
                {errors.cardOwnerPhone && (
                  <p className="text-xs text-red-500">{errors.cardOwnerPhone}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="CardComCardNumber">מספר כרטיס אשראי</Label>
              </div>
              <CardNumberFrame 
                terminalNumber={paymentSession.terminalNumber} 
                cardcomUrl={paymentSession.cardcomUrl} 
                onLoad={() => handleFieldLoad('cardNumber')}
                isReady={!!paymentSession.terminalNumber}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expirationMonth">תוקף</Label>
                <div className="flex space-x-2 space-x-reverse">
                  <select
                    id="expirationMonth"
                    name="expirationMonth"
                    value={formData.expirationMonth}
                    onChange={handleChange}
                    disabled={isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING}
                    className={`block w-full rounded-md border border-input bg-background px-3 py-2 text-right ${errors.expirationMonth ? 'border-red-500' : ''}`}
                  >
                    <option value="">חודש</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                      <option key={month} value={month.toString().padStart(2, '0')}>
                        {month.toString().padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  
                  <select
                    id="expirationYear"
                    name="expirationYear"
                    value={formData.expirationYear}
                    onChange={handleChange}
                    disabled={isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING}
                    className={`block w-full rounded-md border border-input bg-background px-3 py-2 text-right ${errors.expirationYear ? 'border-red-500' : ''}`}
                  >
                    <option value="">שנה</option>
                    {Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                      <option key={year} value={year.toString().substring(2)}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                {(errors.expirationMonth || errors.expirationYear) && (
                  <p className="text-xs text-red-500">נא לבחור תאריך תפוגה תקין</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="CardComCvv">קוד אבטחה (CVV)</Label>
                <CVVFrame 
                  terminalNumber={paymentSession.terminalNumber} 
                  cardcomUrl={paymentSession.cardcomUrl} 
                  onLoad={() => handleFieldLoad('cvv')}
                  isReady={!!paymentSession.terminalNumber}
                />
              </div>
            </div>
            
            <ReCaptchaFrame
              terminalNumber={paymentSession.terminalNumber}
              cardcomUrl={paymentSession.cardcomUrl}
              onLoad={() => handleFieldLoad('reCaptcha')}
            />
            
            <div className="rounded-md bg-muted p-4">
              <p className="text-sm text-center">העסקה מאובטחת ע"י מערכת קארדקום</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col space-y-2">
        {paymentStatus === PaymentStatusEnum.SUCCESS ? (
          <Button
            onClick={onPaymentComplete}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            המשך
          </Button>
        ) : (
          <Button 
            type="button" 
            className="w-full" 
            onClick={handleSubmitPayment}
            disabled={
              isLoading || 
              isSubmitting || 
              !isInitialized || 
              !isCardFieldsReady ||
              paymentStatus === PaymentStatusEnum.PROCESSING
            }
          >
            {isLoading || isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING ? (
              <span className="flex items-center">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                מעבד...
              </span>
            ) : (
              <span className="flex items-center">
                <CreditCard className="mr-2 h-4 w-4" />
                בצע תשלום
              </span>
            )}
          </Button>
        )}
        
        <p className="text-xs text-center text-muted-foreground">
          {plan.hasTrial 
            ? 'החיוב הראשון יבוצע בתום תקופת הניסיון' 
            : 'החיוב יבוצע מיידית'}
        </p>
        
        {onBack && paymentStatus !== PaymentStatusEnum.SUCCESS && (
          <Button 
            variant="outline" 
            onClick={onBack} 
            className="mt-2"
            disabled={isLoading || isSubmitting || paymentStatus === PaymentStatusEnum.PROCESSING}
          >
            חזור
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default IframePaymentSection;
