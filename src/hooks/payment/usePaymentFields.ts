
import { useState, useCallback } from 'react';
import { usePaymentValidation } from './usePaymentValidation';

export const usePaymentFields = () => {
  const [cardholderName, setCardholderName] = useState('');
  const [cardOwnerId, setCardOwnerId] = useState('');
  const [expiryMonth, setExpiryMonth] = useState('');
  const [expiryYear, setExpiryYear] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loadedFields, setLoadedFields] = useState(new Set<string>());

  const {
    cardNumberError,
    cardTypeInfo,
    cvvError,
    cardholderNameError,
    expiryError,
    idNumberError,
    isValid,
    validateCardNumber,
    validateCvv,
    validateIdNumber
  } = usePaymentValidation({
    cardholderName,
    cardOwnerId,
    expiryMonth,
    expiryYear
  });

  const handleFieldLoad = useCallback((fieldName: string) => {
    console.log(`Field loaded: ${fieldName}`);
    setLoadedFields(prev => {
      const newFields = new Set(prev);
      newFields.add(fieldName);
      return newFields;
    });
  }, []);

  return {
    cardholderName,
    setCardholderName,
    cardOwnerId,
    setCardOwnerId,
    expiryMonth,
    setExpiryMonth,
    expiryYear,
    setExpiryYear,
    email,
    setEmail,
    phone,
    setPhone,
    loadedFields,
    cardNumberError,
    cardTypeInfo,
    cvvError,
    cardholderNameError,
    expiryError,
    idNumberError,
    isValid,
    validateCardNumber,
    validateCvv,
    validateIdNumber,
    handleFieldLoad
  };
};
