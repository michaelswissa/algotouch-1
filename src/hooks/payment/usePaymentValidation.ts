
import { useState, useEffect } from 'react';

interface ValidationState {
  cardNumberError: string;
  cardTypeInfo: string;
  cvvError: string;
  cardholderNameError: string;
  expiryError: string;
  isCardNumberValid: boolean;
  isCvvValid: boolean;
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
    expiryError: '',
    isCardNumberValid: false,
    isCvvValid: false
  });

  // Validate cardholder name
  useEffect(() => {
    if (!cardholderName) {
      setValidationState(prev => ({
        ...prev,
        cardholderNameError: 'שם בעל הכרטיס הוא שדה חובה'
      }));
    } else if (cardholderName.length < 2) {
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
      const currentYear = currentDate.getFullYear() % 100;
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

  // Handle CardCom validation messages
  const handleCardValidation = (event: MessageEvent) => {
    const message = event.data;
    if (!message || typeof message !== 'object' || message.action !== 'handleValidations') {
      return;
    }

    switch (message.field) {
      case 'cardNumber':
        setValidationState(prev => ({
          ...prev,
          isCardNumberValid: message.isValid,
          cardNumberError: message.isValid ? '' : (message.message || ''),
          cardTypeInfo: message.isValid && message.cardType ? message.cardType : ''
        }));
        break;

      case 'cvv':
        setValidationState(prev => ({
          ...prev,
          isCvvValid: message.isValid,
          cvvError: message.isValid ? '' : (message.message || '')
        }));
        break;
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
           validationState.isCardNumberValid &&
           validationState.isCvvValid &&
           cardholderName.length >= 2 &&
           expiryMonth &&
           expiryYear;
  };

  return {
    ...validationState,
    isValid
  };
};
