
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CreditCardDisplay from './CreditCardDisplay';
import styles from '@/styles/CreditCardAnimation.module.css';

interface PaymentDetailsProps {
  cardNumber: string;
  setCardNumber: (value: string) => void;
  cardholderName: string;
  setCardholderName: (value: string) => void;
  expiryDate: string;
  setExpiryDate: (value: string) => void;
  cvv: string;
  setCvv: (value: string) => void;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  cardNumber,
  setCardNumber,
  cardholderName,
  setCardholderName,
  expiryDate,
  setExpiryDate,
  cvv,
  setCvv
}) => {
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [preloadClass, setPreloadClass] = useState(true);

  // Remove preload class after component mounts to enable animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreloadClass(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Format card number with spaces after every 4 digits
  const formatCardNumber = (value: string) => {
    // Remove non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Format with spaces after every 4 digits
    const parts = [];
    for (let i = 0; i < digits.length; i += 4) {
      parts.push(digits.substring(i, i + 4));
    }
    
    // Join with spaces and limit to 19 chars (16 digits + 3 spaces)
    return parts.join(' ').substring(0, 19);
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 2) {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
    return digits;
  };

  // Handle CVV focus to flip card
  const handleCvvFocus = () => {
    setIsCardFlipped(true);
  };

  // Handle CVV blur to flip card back
  const handleCvvBlur = () => {
    setIsCardFlipped(false);
  };

  // Update card flip state
  const handleCardFlip = (flipped: boolean) => {
    setIsCardFlipped(flipped);
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className={`${preloadClass ? styles.preload : ''}`}>
        <CreditCardDisplay 
          cardNumber={cardNumber}
          cardholderName={cardholderName}
          expiryDate={expiryDate}
          cvv={cvv}
          onFlip={handleCardFlip}
        />
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="card-number">מספר כרטיס</Label>
          <Input 
            id="card-number" 
            dir="ltr"
            placeholder="1234 5678 9012 3456" 
            value={cardNumber}
            onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
            maxLength={19}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cardholder-name">שם בעל הכרטיס</Label>
          <Input 
            id="cardholder-name" 
            placeholder="ישראל ישראלי" 
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry-date">תוקף</Label>
            <Input 
              id="expiry-date" 
              dir="ltr"
              placeholder="MM/YY" 
              value={expiryDate}
              onChange={(e) => setExpiryDate(formatExpiryDate(e.target.value))}
              maxLength={5}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cvv">CVV</Label>
            <Input 
              id="cvv" 
              dir="ltr"
              placeholder="123" 
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
              maxLength={4}
              onFocus={handleCvvFocus}
              onBlur={handleCvvBlur}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;
