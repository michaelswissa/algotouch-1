import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
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
  const [cardDataValid, setCardDataValid] = useState(false);
  const [errors, setErrors] = useState({ cardNumber: '' });
  const [cardTypeInfo, setCardTypeInfo] = useState('');

  const handleFieldValidation = (field: string, isValid: boolean, message?: string) => {
    if (!isValid && message) {
      setErrors(prev => ({
        ...prev,
        [field]: message
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCardNumberValidation = (event: MessageEvent) => {
    if (!event.origin.includes('cardcom.solutions')) return;
    if (event.data?.action === 'handleValidations' && event.data?.field === 'cardNumber') {
      handleFieldValidation('cardNumber', event.data.isValid, event.data.message);
      if (event.data.cardType) {
        setCardTypeInfo(event.data.cardType);
      }
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleCardNumberValidation);
    return () => window.removeEventListener('message', handleCardNumberValidation);
  }, []);

  const handlePaymentSubmit = () => {
    if (masterFrameRef.current?.contentWindow) {
      const submitMessage = {
        action: 'submitPayment',
        cardOwnerName: cardholderName,
        cardExpMonth: expiryMonth,
        cardExpYear: expiryYear
      };
      masterFrameRef.current.contentWindow.postMessage(submitMessage, 'https://secure.cardcom.solutions');
    }
  };

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
          <iframe
            id="card-number-frame"
            src={`${cardcomUrl}/openFields/card-number.html?terminalnumber=${terminalNumber}&rtl=true`}
            className="w-full h-[40px] border border-input rounded-md"
            onLoad={() => setCardNumberFrameLoaded(true)}
            title="מספר כרטיס"
          />
          {errors.cardNumber && (
            <p className="mt-1 text-sm text-red-500">{errors.cardNumber}</p>
          )}
          {cardTypeInfo && (
            <p className="mt-1 text-sm text-muted-foreground">
              סוג כרטיס: {cardTypeInfo}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry-month">חודש תפוגה</Label>
          <select
            id="expiry-month"
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
            value={expiryMonth}
            onChange={(e) => setExpiryMonth(e.target.value)}
            required
          >
            <option value="" disabled>חודש</option>
            {Array.from({ length: 12 }, (_, i) => {
              const month = (i + 1).toString().padStart(2, '0');
              return (
                <option key={month} value={month}>
                  {month}
                </option>
              );
            })}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="expiry-year">שנת תפוגה</Label>
          <select
            id="expiry-year"
            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
            value={expiryYear}
            onChange={(e) => setExpiryYear(e.target.value)}
            required
          >
            <option value="" disabled>שנה</option>
            {Array.from({ length: 10 }, (_, i) => {
              const year = (new Date().getFullYear() + i).toString().slice(2);
              return (
                <option key={year} value={year}>
                  {year}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="cvv-frame">קוד אבטחה (CVV)</Label>
        <div className="relative" style={{ maxWidth: '100px' }}>
          {!cvvFrameLoaded && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800 rounded border border-input">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          )}
          <iframe
            id="cvv-frame"
            src={`${cardcomUrl}/openFields/cvv-field.html?terminalnumber=${terminalNumber}&rtl=true`}
            className="w-full h-[40px] border border-input rounded-md"
            onLoad={() => setCvvFrameLoaded(true)}
            title="קוד אבטחה"
          ></iframe>
        </div>
      </div>

      <Card className="bg-gray-50 dark:bg-gray-900 p-3">
        <p className="text-xs text-muted-foreground flex items-center">
          <span className="mr-1">🔒</span>
          פרטי התשלום מאובטחים ומוצפנים בתקן PCI DSS. הכרטיס יחויב רק לאחר אישור.
        </p>
      </Card>
    </div>
  );
};

export default PaymentDetails;
