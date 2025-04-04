
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { CreditCard, User, Calendar, Shield } from 'lucide-react';
import CreditCardDisplay from '@/components/payment/CreditCardDisplay';
import { isValidCardNumber, isValidExpiryDate, isValidCVV, getCreditCardType } from './utils/paymentHelpers';

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
  const [isCvvFocused, setIsCvvFocused] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [cardType, setCardType] = useState('');
  const [isFlipped, setIsFlipped] = useState(false);
  const [animateCard, setAnimateCard] = useState(false);
  
  // Format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format with spaces
    if (value.length > 0) {
      // Check if it's AMEX (starts with 34 or 37)
      const isAmex = /^3[47]/.test(value);
      
      if (isAmex) {
        // Format as XXXX XXXXXX XXXXX for AMEX (4-6-5 format)
        if (value.length > 4 && value.length <= 10) {
          value = value.slice(0, 4) + ' ' + value.slice(4);
        } else if (value.length > 10) {
          value = value.slice(0, 4) + ' ' + value.slice(4, 10) + ' ' + value.slice(10);
        }
        value = value.substring(0, 17); // AMEX has 15 digits plus 2 spaces
      } else {
        // Format as XXXX XXXX XXXX XXXX for other cards
        value = value.match(/.{1,4}/g)?.join(' ') || value;
        value = value.substring(0, 19); // Other cards have 16 digits plus 3 spaces
      }
    }
    
    // Update card type
    const cleanNumber = value.replace(/\s/g, '');
    const type = getCreditCardType(cleanNumber);
    setCardType(type);
    
    // Validate the card number
    if (cleanNumber.length >= 13) {
      if (!isValidCardNumber(cleanNumber)) {
        setErrors(prev => ({ ...prev, cardNumber: 'מספר כרטיס לא תקין' }));
      } else {
        setErrors(prev => ({ ...prev, cardNumber: '' }));
      }
    } else {
      setErrors(prev => ({ ...prev, cardNumber: '' }));
    }
    
    setCardNumber(value);
  };

  // Format expiry date as MM/YY
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 0) {
      // First digit can only be 0 or 1
      if (value.length === 1 && parseInt(value) > 1) {
        value = '0' + value;
      }
      
      // Second digit for months can't be > 2 if first digit is 1
      if (value.length === 2 && value[0] === '1' && parseInt(value[1]) > 2) {
        value = '1' + '2';
      }
      
      // Format MM/YY
      if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      
      // Limit to MM/YY format (5 chars)
      value = value.substring(0, 5);
    }
    
    // Validate expiry date if complete
    if (value.length === 5) {
      if (!isValidExpiryDate(value)) {
        setErrors(prev => ({ ...prev, expiryDate: 'תאריך פג תוקף' }));
      } else {
        setErrors(prev => ({ ...prev, expiryDate: '' }));
      }
    } else {
      setErrors(prev => ({ ...prev, expiryDate: '' }));
    }
    
    setExpiryDate(value);
  };

  // Validate CVV format
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    // AMEX has 4-digit CVV, others have 3-digit
    const isAmex = /^3[47]/.test(cardNumber);
    const maxLength = isAmex ? 4 : 3;
    
    if (value.length === maxLength) {
      if (!isValidCVV(value, cardType)) {
        setErrors(prev => ({ ...prev, cvv: 'קוד אבטחה לא תקין' }));
      } else {
        setErrors(prev => ({ ...prev, cvv: '' }));
      }
    } else {
      setErrors(prev => ({ ...prev, cvv: '' }));
    }
    
    setCvv(value.substring(0, maxLength));
  };

  const handleCardholderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase();
    
    // Basic validation for name - at least 3 characters
    if (value && value.length < 3) {
      setErrors(prev => ({ ...prev, cardholderName: 'שם קצר מדי' }));
    } else {
      setErrors(prev => ({ ...prev, cardholderName: '' }));
    }
    
    setCardholderName(value);
  };

  const handleCvvFocus = () => {
    setIsCvvFocused(true);
    setAnimateCard(true);
    setIsFlipped(true);
  };

  const handleCvvBlur = () => {
    setIsCvvFocused(false);
    setIsFlipped(false);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Credit Card Display */}
      <div className="mb-6">
        <CreditCardDisplay 
          cardNumber={cardNumber}
          cardholderName={cardholderName}
          expiryDate={expiryDate}
          cvv={cvv}
          onFlip={setIsCvvFocused}
        />
      </div>
      
      {/* Credit Card Form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="card-number" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" />
            מספר כרטיס
          </Label>
          <Input
            id="card-number"
            placeholder="0000 0000 0000 0000"
            value={cardNumber}
            onChange={handleCardNumberChange}
            maxLength={19}
            className={`text-lg text-right ${errors.cardNumber ? 'border-red-500 focus:border-red-500' : ''}`}
            autoComplete="cc-number"
            onFocus={() => setIsCvvFocused(false)}
          />
          {errors.cardNumber && <p className="text-sm text-red-500">{errors.cardNumber}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cardholder-name" className="flex items-center gap-1">
            <User className="h-4 w-4" />
            שם בעל הכרטיס
          </Label>
          <Input
            id="cardholder-name"
            placeholder="שם מלא כפי שמופיע על הכרטיס"
            value={cardholderName}
            onChange={handleCardholderNameChange}
            className={`text-right ${errors.cardholderName ? 'border-red-500 focus:border-red-500' : ''}`}
            autoComplete="cc-name"
            onFocus={() => setIsCvvFocused(false)}
          />
          {errors.cardholderName && <p className="text-sm text-red-500">{errors.cardholderName}</p>}
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="expiry-date" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              תוקף
            </Label>
            <Input
              id="expiry-date"
              placeholder="MM/YY"
              value={expiryDate}
              onChange={handleExpiryDateChange}
              maxLength={5}
              className={`text-right ${errors.expiryDate ? 'border-red-500 focus:border-red-500' : ''}`}
              autoComplete="cc-exp"
              onFocus={() => setIsCvvFocused(false)}
            />
            {errors.expiryDate && <p className="text-sm text-red-500">{errors.expiryDate}</p>}
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cvv" className="flex items-center gap-1">
              <Shield className="h-4 w-4" />
              קוד אבטחה (CVV)
            </Label>
            <Input
              id="cvv"
              placeholder={cardNumber.startsWith('3') ? '4 ספרות' : '3 ספרות'}
              value={cvv}
              onChange={handleCvvChange}
              maxLength={cardNumber.startsWith('3') ? 4 : 3}
              className={`text-right ${errors.cvv ? 'border-red-500 focus:border-red-500' : ''}`}
              autoComplete="cc-csc"
              onFocus={handleCvvFocus}
              onBlur={handleCvvBlur}
            />
            {errors.cvv && <p className="text-sm text-red-500">{errors.cvv}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;
