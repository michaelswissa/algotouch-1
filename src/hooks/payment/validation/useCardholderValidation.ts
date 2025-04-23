
import { useState, useEffect } from 'react';

interface CardholderValidationState {
  cardholderNameError: string;
  idNumberError: string;
}

export const useCardholderValidation = (cardholderName: string, cardOwnerId: string) => {
  const [validationState, setValidationState] = useState<CardholderValidationState>({
    cardholderNameError: '',
    idNumberError: '',
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

  const validateIdNumber = (id: string) => {
    if (!id) {
      setValidationState(prev => ({
        ...prev,
        idNumberError: 'תעודת זהות הינה שדה חובה'
      }));
      return false;
    }

    if (!/^\d{9}$/.test(id)) {
      setValidationState(prev => ({
        ...prev,
        idNumberError: 'תעודת זהות חייבת להכיל 9 ספרות'
      }));
      return false;
    }

    setValidationState(prev => ({ ...prev, idNumberError: '' }));
    return true;
  };

  useEffect(() => {
    validateIdNumber(cardOwnerId);
  }, [cardOwnerId]);

  return {
    ...validationState,
    validateIdNumber,
  };
};

