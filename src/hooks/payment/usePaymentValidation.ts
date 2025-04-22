
import { useState, useCallback } from 'react';
import { PaymentValidationState } from '@/components/payment/types/payment';

interface ValidationProps {
  cardholderName: string;
  cardOwnerId: string;
  expiryMonth: string;
  expiryYear: string;
}

export const usePaymentValidation = ({
  cardholderName,
  cardOwnerId,
  expiryMonth,
  expiryYear
}: ValidationProps) => {
  const [state, setState] = useState<PaymentValidationState>({
    isValid: true,
  });

  const validateCardNumber = useCallback((isValid: boolean, cardType?: string) => {
    setState(prev => ({
      ...prev,
      cardNumberError: isValid ? undefined : 'מספר כרטיס לא תקין',
      cardTypeInfo: cardType,
      isValid: isValid && prev.isValid
    }));
  }, []);

  const validateCvv = useCallback((isValid: boolean) => {
    setState(prev => ({
      ...prev,
      cvvError: isValid ? undefined : 'קוד אבטחה לא תקין',
      isValid: isValid && prev.isValid
    }));
  }, []);

  const validateIdNumber = useCallback((idNumber: string) => {
    const isValid = /^\d{9}$/.test(idNumber);
    setState(prev => ({
      ...prev,
      idNumberError: isValid ? undefined : 'תעודת זהות חייבת להכיל 9 ספרות',
      isValid: isValid && prev.isValid
    }));
    return isValid;
  }, []);

  const validateExpiryDate = useCallback(() => {
    if (!expiryMonth || !expiryYear) {
      setState(prev => ({
        ...prev,
        expiryError: 'יש לבחור תאריך תפוגה',
        isValid: false
      }));
      return false;
    }

    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100; // Get last 2 digits
    const currentMonth = currentDate.getMonth() + 1; // JS months are 0-indexed
    
    const selectedYear = parseInt(expiryYear);
    const selectedMonth = parseInt(expiryMonth);

    let isValid = true;
    let errorMessage;

    if (selectedYear < currentYear || (selectedYear === currentYear && selectedMonth < currentMonth)) {
      isValid = false;
      errorMessage = 'תאריך תפוגה לא תקין - הכרטיס פג תוקף';
    }

    setState(prev => ({
      ...prev,
      expiryError: errorMessage,
      isValid: isValid && prev.isValid
    }));

    return isValid;
  }, [expiryMonth, expiryYear]);

  const validateCardholderName = useCallback(() => {
    const isValid = cardholderName.trim().length > 0;
    setState(prev => ({
      ...prev,
      cardholderNameError: isValid ? undefined : 'שם בעל הכרטיס הוא שדה חובה',
      isValid: isValid && prev.isValid
    }));
    return isValid;
  }, [cardholderName]);

  const resetValidation = useCallback(() => {
    setState({
      isValid: true,
    });
  }, []);

  return {
    ...state,
    validateCardNumber,
    validateCvv,
    validateIdNumber,
    validateExpiryDate,
    validateCardholderName,
    resetValidation
  };
};
