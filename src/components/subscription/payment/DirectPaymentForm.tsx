
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Shield, ShieldCheck, CreditCard, Lock, AlarmClock } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { TokenData } from '@/types/payment';
import PaymentDetails from '@/components/payment/PaymentDetails';

interface DirectPaymentFormProps {
  selectedPlan: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

/**
 * DirectPaymentForm - A PCI-compliant payment form that collects card details
 * and processes them securely via the server-side Edge function
 */
const DirectPaymentForm: React.FC<DirectPaymentFormProps> = ({ 
  selectedPlan,
  onPaymentComplete,
  onBack
}) => {
  const navigate = useNavigate();
  
  // Card details state
  const [cardNumber, setCardNumber] = useState('');
  const [cardholderName, setCardholderName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /**
   * Validate payment form fields
   */
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Validate Card Number (remove spaces for validation)
    const cleanCardNumber = cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber || cleanCardNumber.length < 14 || cleanCardNumber.length > 19) {
      newErrors.cardNumber = 'מספר כרטיס לא תקין';
    }
    
    // Validate Cardholder Name
    if (!cardholderName || cardholderName.trim().length < 3) {
      newErrors.cardholderName = 'יש להזין שם מלא';
    }
    
    // Validate Expiry Date (MM/YY format)
    const expiryRegex = /^(0[1-9]|1[0-2])\/\d{2}$/;
    if (!expiryDate || !expiryRegex.test(expiryDate)) {
      newErrors.expiryDate = 'תאריך תפוגה לא תקין';
    } else {
      // Check if card is expired
      const [month, year] = expiryDate.split('/');
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      const expiryYear = parseInt(year, 10);
      const expiryMonth = parseInt(month, 10);
      
      if (expiryYear < currentYear || (expiryYear === currentYear && expiryMonth < currentMonth)) {
        newErrors.expiryDate = 'הכרטיס פג תוקף';
      }
    }
    
    // Validate CVV
    const cvvRegex = /^\d{3,4}$/;
    if (!cvv || !cvvRegex.test(cvv)) {
      newErrors.cvv = 'קוד אבטחה לא תקין';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Process payment via server-side Edge function
   */
  const handleProcessPayment = async () => {
    // Validate form first
    if (!validateForm()) {
      toast.error('אנא מלא את כל השדות הנדרשים');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Format expiry date for API
      const [month, year] = expiryDate.split('/');
      const formattedExpiryDate = `${month}/20${year}`;
      
      // Clean card number (remove spaces)
      const cleanCardNumber = cardNumber.replace(/\s/g, '');
      
      // Get registration data from session storage (if exists)
      let registrationData = null;
      try {
        const storedData = sessionStorage.getItem('registration_data');
        if (storedData) {
          registrationData = JSON.parse(storedData);
        }
      } catch (e) {
        console.error('Error parsing registration data:', e);
      }
      
      console.log('Calling direct-payment/process edge function...');
      
      // Process payment via server-side Edge function with complete URL to avoid 404 errors
      const { data, error } = await supabase.functions.invoke('direct-payment/process', {
        body: {
          planId: selectedPlan,
          cardDetails: {
            cardNumber: cleanCardNumber,
            expiryDate: formattedExpiryDate,
            cvv,
            cardholderName
          },
          registrationData
        }
      });
      
      if (error) {
        console.error('Payment processing error:', error);
        toast.error(`אירעה שגיאה בעיבוד התשלום: ${error.message}`);
        setIsProcessing(false);
        return;
      }
      
      console.log('Payment process response:', data);
      
      if (!data.success) {
        toast.error(data.error || 'אירעה שגיאה בעיבוד התשלום');
        setIsProcessing(false);
        return;
      }
      
      // Extract payment details
      const { tokenInfo, transactionId } = data;
      
      // Log successful payment
      console.log('Payment successful:', { tokenInfo, transactionId });
      
      // Store token data
      if (tokenInfo) {
        const tokenData: TokenData = {
          token: tokenInfo.token,
          lastFourDigits: cleanCardNumber.slice(-4),
          expiryMonth: month,
          expiryYear: `20${year}`,
          cardholderName
        };
        
        // If we have registration data, update it with token
        if (registrationData) {
          registrationData.paymentToken = tokenData;
          sessionStorage.setItem('registration_data', JSON.stringify(registrationData));
        }
        
        // Update session flow to mark payment complete
        try {
          const sessionData = sessionStorage.getItem('subscription_flow');
          const parsedSession = sessionData 
            ? JSON.parse(sessionData) 
            : { step: 'completion' };
          
          parsedSession.step = 'completion';
          parsedSession.selectedPlan = selectedPlan;
          parsedSession.paymentComplete = true;
          
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        } catch (e) {
          console.error('Error updating session flow:', e);
        }
      }
      
      // Show success message
      toast.success('התשלום התקבל בהצלחה!');
      
      // Call payment complete callback
      setTimeout(() => {
        setIsProcessing(false);
        onPaymentComplete();
      }, 1000);
      
    } catch (error) {
      console.error('Error processing payment:', error);
      toast.error('אירעה שגיאה בעיבוד התשלום');
      setIsProcessing(false);
    }
  };

  const getPlanDetails = () => {
    const planDetails: Record<string, { name: string, description: string, price: number }> = {
      'monthly': {
        name: 'מנוי חודשי',
        description: 'חידוש אוטומטי מדי חודש',
        price: 99
      },
      'annual': {
        name: 'מנוי שנתי',
        description: 'חיוב שנתי אחד',
        price: 899
      },
      'vip': {
        name: 'מנוי VIP',
        description: 'גישה מלאה לכל התכונות',
        price: 3499
      }
    };
    
    return planDetails[selectedPlan] || { name: 'מנוי', description: '', price: 0 };
  };

  const planDetails = getPlanDetails();

  return (
    <Card className="border-primary/20 hover-glow transition-shadow duration-300 relative overflow-hidden">
      {/* Payment Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-primary/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <h3 className="font-semibold text-lg">תשלום מאובטח</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground">
            חזרה
          </Button>
        </div>
        
        <div className="flex flex-col gap-1 mt-3">
          <h4 className="font-medium text-lg">{planDetails.name}</h4>
          <p className="text-muted-foreground text-sm">{planDetails.description}</p>
          <p className="text-xl font-semibold mt-1">${planDetails.price} USD</p>
        </div>
        
        {/* Security badges */}
        <div className="flex flex-wrap gap-3 items-center mt-3">
          <div className="flex items-center gap-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded text-xs border border-green-200 dark:border-green-900/30">
            <ShieldCheck className="h-3 w-3" />
            <span>SSL מאובטח</span>
          </div>
          <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded text-xs border border-blue-200 dark:border-blue-900/30">
            <Lock className="h-3 w-3" />
            <span>PCI DSS</span>
          </div>
          <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded text-xs border border-purple-200 dark:border-purple-900/30">
            <CreditCard className="h-3 w-3" />
            <span>תשלום מוצפן</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="mb-6">
          <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg p-3 text-sm text-yellow-800 dark:text-yellow-300 flex items-start gap-2">
            <AlarmClock className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <p>פרטי הכרטיס מאובטחים ומעובדים בצד השרת בהתאם לתקני PCI DSS. האתר אינו שומר את פרטי כרטיס האשראי שלך.</p>
          </div>
        </div>
        
        {/* Card Details Form */}
        <div className="space-y-6">
          <PaymentDetails
            cardNumber={cardNumber}
            setCardNumber={setCardNumber}
            cardholderName={cardholderName}
            setCardholderName={setCardholderName}
            expiryDate={expiryDate}
            setExpiryDate={setExpiryDate}
            cvv={cvv}
            setCvv={setCvv}
          />

          {/* Error display */}
          {Object.keys(errors).length > 0 && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              <ul className="list-disc list-inside space-y-1">
                {Object.values(errors).map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Payment submit button */}
          <Button 
            className="w-full"
            size="lg"
            onClick={handleProcessPayment}
            disabled={isProcessing}
          >
            {isProcessing ? 'מעבד תשלום...' : 'בצע תשלום'}
          </Button>
          
          {/* Secure payment notice */}
          <p className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
            <Lock className="h-3 w-3" />
            <span>מאובטח על ידי Cardcom</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DirectPaymentForm;
