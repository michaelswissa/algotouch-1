
import React, { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CardNumberFrame from './iframes/CardNumberFrame';
import CVVFrame from './iframes/CVVFrame';
import CardExpiryInputs from './CardExpiryInputs';
import SecurityNote from './SecurityNote';
import { Loader2 } from 'lucide-react';

interface PaymentDetailsProps {
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ 
  terminalNumber, 
  cardcomUrl,
  masterFrameRef 
}) => {
  const [cardNumberFrameLoaded, setCardNumberFrameLoaded] = useState(false);
  const [cvvFrameLoaded, setCvvFrameLoaded] = useState(false);
  const [cardholderName, setCardholderName] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [frameLoadAttempts, setFrameLoadAttempts] = useState(0);

  // Reset frame load status when terminal number changes
  React.useEffect(() => {
    if (terminalNumber) {
      setCardNumberFrameLoaded(false);
      setCvvFrameLoaded(false);
      setFrameLoadAttempts(0);
    }
  }, [terminalNumber]);

  // Retry loading frames if they fail to load
  React.useEffect(() => {
    if (!cardNumberFrameLoaded || !cvvFrameLoaded) {
      const maxAttempts = 3;
      if (frameLoadAttempts < maxAttempts && terminalNumber) {
        const timer = setTimeout(() => {
          console.log(`Retrying frame load, attempt ${frameLoadAttempts + 1}`);
          setFrameLoadAttempts(prev => prev + 1);
        }, 1000);
        return () => clearTimeout(timer);
      }
    }
  }, [cardNumberFrameLoaded, cvvFrameLoaded, frameLoadAttempts, terminalNumber]);

  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="cardholder-name">שם בעל הכרטיס</Label>
        <Input
          id="cardholder-name"
          placeholder="ישראל ישראלי"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="card-number-frame">מספר כרטיס</Label>
        <div className="relative">
          {!cardNumberFrameLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-input">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <CardNumberFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => setCardNumberFrameLoaded(true)}
            frameLoadAttempts={frameLoadAttempts}
          />
        </div>
      </div>

      <CardExpiryInputs
        expiryMonth={expiryMonth}
        expiryYear={expiryYear}
        onMonthChange={setExpiryMonth}
        onYearChange={setExpiryYear}
      />

      <div className="space-y-2">
        <Label htmlFor="cvv-frame">קוד אבטחה (CVV)</Label>
        <div className="relative">
          {!cvvFrameLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-input">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <CVVFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => setCvvFrameLoaded(true)}
            frameLoadAttempts={frameLoadAttempts}
          />
        </div>
      </div>

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
