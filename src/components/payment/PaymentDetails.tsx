
import React, { useState, useEffect } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import CreditCardDisplay from './CreditCardDisplay';
import styles from '@/styles/CreditCardDisplay.module.css';

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

  // Remove preload class after component mounts
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreloadClass(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const formatCardNumber = (value: string) => {
    const digits = value.replace(/\D/g, '');
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || digits;
    return formatted;
  };

  const formatExpiryDate = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length > 2) {
      return `${digits.substring(0, 2)}/${digits.substring(2, 4)}`;
    }
    return digits;
  };

  const handleCvvFocus = () => {
    setIsCardFlipped(true);
  };

  const handleCvvBlur = () => {
    setIsCardFlipped(false);
  };

  const handleCardFlip = (flipped: boolean) => {
    setIsCardFlipped(flipped);
  };

  return (
    <div className="space-y-6">
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
              placeholder="123" 
              value={cvv}
              onChange={(e) => setCvv(e.target.value.replace(/\D/g, ''))}
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
