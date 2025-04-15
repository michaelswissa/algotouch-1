
import { useState, useEffect } from 'react';

interface ValidationState {
  cardNumberError: string;
  cardTypeInfo: string;
  cvvError: string;
  cardholderNameError: string;
  expiryError: string;
}

interface PaymentValidationProps {
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
}

export const usePaymentValidation = ({ 
  cardholderName, 
  expiryMonth, 
  expiryYear 
}: PaymentValidationProps) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    cardNumberError: '',
    cardTypeInfo: '',
    cvvError: '',
    cardholderNameError: '',
    expiryError: ''
  });

  // Validate cardholder name
  useEffect(() => {
    if (cardholderName && cardholderName.length < 2) {
      setValidationState(prev => ({
        ...prev,
        cardholderNameError: 'שם בעל הכרטיס חייב להכיל לפחות 2 תווים'
      }));
    } else {
      setValidationState(prev => ({ ...prev, cardholderNameError: '' }));
    }
  }, [cardholderName]);

  // Validate expiry date
  useEffect(() => {
    if (expiryMonth && expiryYear) {
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
      const currentMonth = currentDate.getMonth() + 1;
      const selectedYear = parseInt(expiryYear);
      const selectedMonth = parseInt(expiryMonth);

      if (selectedYear < currentYear || 
          (selectedYear === currentYear && selectedMonth < currentMonth)) {
        setValidationState(prev => ({
          ...prev,
          expiryError: 'תאריך תפוגה לא תקין'
        }));
      } else {
        setValidationState(prev => ({ ...prev, expiryError: '' }));
      }
    }
  }, [expiryMonth, expiryYear]);

  // Handle card validation messages from CardCom iframe using their format
  const handleCardValidation = (event: MessageEvent) => {
    // Accept messages from any origin as shown in the examples
    if (event.data && typeof event.data === 'object' && 'action' in event.data) {
      if (event.data.action === 'handleValidations') {
        if (event.data.field === 'cardNumber') {
          setValidationState(prev => ({
            ...prev,
            cardNumberError: event.data.isValid ? '' : (event.data.message || ''),
            cardTypeInfo: event.data.isValid && event.data.cardType ? event.data.cardType : ''
          }));
        } else if (event.data.field === 'cvv') {
          setValidationState(prev => ({
            ...prev,
            cvvError: event.data.isValid ? '' : (event.data.message || '')
          }));
        }
      }
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleCardValidation);
    return () => window.removeEventListener('message', handleCardValidation);
  }, []);

  const isValid = () => {
    return !validationState.cardNumberError &&
           !validationState.cvvError &&
           !validationState.cardholderNameError &&
           !validationState.expiryError &&
           cardholderName.length >= 2 &&
           expiryMonth &&
           expiryYear;
  };

  return {
    ...validationState,
    isValid
  };
};
