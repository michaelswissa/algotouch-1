
import React, { useState, useEffect } from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import CreditCardDisplay from '@/components/payment/CreditCardDisplay';

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
  
  // Format card number with spaces
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format with spaces
    if (value.length > 0) {
      // Check if it's AMEX (starts with 34 or 37)
      const isAmex = /^3[47]/.test(value);
      
      if (isAmex) {
        // Format as XXXX XXXXXX XXXXX for AMEX
        value = value.match(/.{1,4}|.{1,6}|.+/g)?.join(' ') || value;
        value = value.substring(0, 17); // AMEX has 15 digits plus 2 spaces
      } else {
        // Format as XXXX XXXX XXXX XXXX for other cards
        value = value.match(/.{1,4}/g)?.join(' ') || value;
        value = value.substring(0, 19); // Other cards have 16 digits plus 3 spaces
      }
    }
    
    setCardNumber(value);
  };

  // Format expiry date as MM/YY
  const handleExpiryDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value.length > 0) {
      // Format MM/YY
      if (value.length > 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
      }
      
      // Limit to MM/YY format (5 chars)
      value = value.substring(0, 5);
    }
    
    setExpiryDate(value);
  };

  // Validate CVV format
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    // AMEX has 4-digit CVV, others have 3-digit
    const isAmex = /^3[47]/.test(cardNumber);
    const maxLength = isAmex ? 4 : 3;
    setCvv(value.substring(0, maxLength));
  };

  const handleCardholderNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCardholderName(e.target.value.toUpperCase());
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
        <FormItem>
          <FormLabel>מספר כרטיס</FormLabel>
          <FormControl>
            <Input
              placeholder="0000 0000 0000 0000"
              value={cardNumber}
              onChange={handleCardNumberChange}
              maxLength={19}
              className="text-lg text-right"
              autoComplete="cc-number"
              onFocus={() => setIsCvvFocused(false)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
        
        <FormItem>
          <FormLabel>שם בעל הכרטיס</FormLabel>
          <FormControl>
            <Input
              placeholder="שם מלא כפי שמופיע על הכרטיס"
              value={cardholderName}
              onChange={handleCardholderNameChange}
              className="text-right"
              autoComplete="cc-name"
              onFocus={() => setIsCvvFocused(false)}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
        
        <div className="grid grid-cols-2 gap-4">
          <FormItem className="space-y-2">
            <FormLabel>תוקף</FormLabel>
            <FormControl>
              <Input
                placeholder="MM/YY"
                value={expiryDate}
                onChange={handleExpiryDateChange}
                maxLength={5}
                className="text-right"
                autoComplete="cc-exp"
                onFocus={() => setIsCvvFocused(false)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
          
          <FormItem className="space-y-2">
            <FormLabel>קוד אבטחה (CVV)</FormLabel>
            <FormControl>
              <Input
                placeholder={cardNumber.startsWith('3') ? '4 ספרות' : '3 ספרות'}
                value={cvv}
                onChange={handleCvvChange}
                maxLength={cardNumber.startsWith('3') ? 4 : 3}
                className="text-right"
                autoComplete="cc-csc"
                onFocus={() => setIsCvvFocused(true)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;
