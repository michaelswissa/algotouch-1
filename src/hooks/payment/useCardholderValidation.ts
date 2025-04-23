
import { useState, useEffect } from 'react';

interface CardholderValidationProps {
  cardholderName: string;
  cardOwnerId: string;
  minNameLength?: number;
  idLength?: number;
  messages?: {
    requiredName?: string;
    invalidNameLength?: string;
    requiredId?: string;
    invalidIdLength?: string;
  };
}

interface CardholderValidationState {
  cardholderNameError: string;
  idNumberError: string;
}

export const useCardholderValidation = ({ 
  cardholderName,
  cardOwnerId,
  minNameLength = 2,
  idLength = 9,
  messages = {
    requiredName: 'שם בעל הכרטיס הוא שדה חובה',
    invalidNameLength: 'שם בעל הכרטיס חייב להכיל לפחות 2 תווים',
    requiredId: 'תעודת זהות הינה שדה חובה',
    invalidIdLength: 'תעודת זהות חייבת להכיל 9 ספרות'
  }
}: CardholderValidationProps) => {
  const [validationState, setValidationState] = useState<CardholderValidationState>({
    cardholderNameError: '',
    idNumberError: '',
  });

  // Validate cardholder name
  useEffect(() => {
    if (!cardholderName) {
      setValidationState(prev => ({
        ...prev,
        cardholderNameError: messages.requiredName
      }));
    } else if (cardholderName.length < minNameLength) {
      setValidationState(prev => ({
        ...prev,
        cardholderNameError: messages.invalidNameLength
      }));
    } else {
      setValidationState(prev => ({ ...prev, cardholderNameError: '' }));
    }
  }, [cardholderName, minNameLength, messages]);

  const validateIdNumber = (id: string) => {
    if (!id) {
      setValidationState(prev => ({
        ...prev,
        idNumberError: messages.requiredId
      }));
      return false;
    }

    const pattern = new RegExp(`^\\d{${idLength}}$`);
    if (!pattern.test(id)) {
      setValidationState(prev => ({
        ...prev,
        idNumberError: messages.invalidIdLength
      }));
      return false;
    }

    setValidationState(prev => ({ ...prev, idNumberError: '' }));
    return true;
  };

  useEffect(() => {
    validateIdNumber(cardOwnerId);
  }, [cardOwnerId, idLength]);

  return {
    ...validationState,
    validateIdNumber,
  };
};

