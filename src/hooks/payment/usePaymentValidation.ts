import { useState, useEffect } from 'react';

interface ValidationState {
  cardNumberError: string;
  cardTypeInfo: string;
  cvvError: string;
  cardholderNameError: string;
  idNumberError: string;
  expiryError: string;
  isCardNumberValid: boolean;
  isCvvValid: boolean;
}

interface PaymentValidationProps {
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
}: PaymentValidationProps) => {
  const [validationState, setValidationState] = useState<ValidationState>({
    cardNumberError: '',
    cardTypeInfo: '',
    cvvError: '',
    cardholderNameError: '',
    idNumberError: '',
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

  // Validate Israeli ID number
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

    // Clear error if valid
    setValidationState(prev => ({ ...prev, idNumberError: '' }));
    return true;
  };

  useEffect(() => {
    validateIdNumber(cardOwnerId);
  }, [cardOwnerId]);

  // Validate expiry date - check format and valid date
  useEffect(() => {
    // Only validate if both values are present
    if (expiryMonth && expiryYear) {
      // Ensure month is 01-12 format
      if (!/^(0[1-9]|1[0-2])$/.test(expiryMonth)) {
        setValidationState(prev => ({
          ...prev,
          expiryError: 'פורמט חודש לא תקין (דרוש 01-12)'
        }));
        return;
      }

      // Ensure year is 2-digit format
      if (!/^\d{2}$/.test(expiryYear)) {
        setValidationState(prev => ({
          ...prev,
          expiryError: 'פורמט שנה לא תקין (דרוש 2 ספרות)'
        }));
        return;
      }

      // Check if date is in the future
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100; // 2-digit year
      const currentMonth = currentDate.getMonth() + 1;
      const selectedYear = parseInt(expiryYear);
      const selectedMonth = parseInt(expiryMonth);

      if (selectedYear < currentYear || 
         (selectedYear === currentYear && selectedMonth < currentMonth)) {
        setValidationState(prev => ({
          ...prev,
          expiryError: 'תאריך תפוגה לא תקין - הכרטיס פג תוקף'
        }));
      } else {
        setValidationState(prev => ({ ...prev, expiryError: '' }));
      }
    }
  }, [expiryMonth, expiryYear]);

  // Handle CardCom validation messages
  const handleCardValidation = (event: MessageEvent) => {
    // Safety check for message origin
    if (!event.origin.includes('cardcom.solutions') && 
        !event.origin.includes('localhost') && 
        !event.origin.includes(window.location.origin)) {
      return;
    }

    const message = event.data;
    
    if (!message || typeof message !== 'object' || message.action !== 'handleValidations') {
      return;
    }

    console.log('Received validation message:', message);

    switch (message.field) {
      case 'cardNumber':
        setValidationState(prev => ({
          ...prev,
          isCardNumberValid: message.isValid,
          cardNumberError: message.isValid ? '' : (message.message || 'מספר כרטיס לא תקין'),
          cardTypeInfo: message.isValid && message.cardType ? message.cardType : ''
        }));
        
        // Apply CSS classes as shown in the example
        if (message.isValid) {
          const iframe = document.getElementById('CardComCardNumber') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ 
              action: 'removeCardNumberFieldClass', 
              className: "invalid" 
            }, '*');
          }
        } else {
          const iframe = document.getElementById('CardComCardNumber') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ 
              action: 'addCardNumberFieldClass', 
              className: "invalid" 
            }, '*');
          }
        }
        break;

      case 'cvv':
        setValidationState(prev => ({
          ...prev,
          isCvvValid: message.isValid,
          cvvError: message.isValid ? '' : (message.message || 'קוד אבטחה לא תקין')
        }));
        
        // Apply CSS classes as shown in the example
        if (message.isValid) {
          const iframe = document.getElementById('CardComCvv') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ 
              action: 'removeCvvFieldClass', 
              className: "invalid" 
            }, '*');
          }
        } else {
          const iframe = document.getElementById('CardComCvv') as HTMLIFrameElement;
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({ 
              action: 'addCvvFieldClass', 
              className: "invalid" 
            }, '*');
          }
        }
        break;
        
      case 'reCaptcha':
        console.log('reCaptcha validation:', message.isValid);
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleCardValidation);
    return () => window.removeEventListener('message', handleCardValidation);
  }, []);

  // Manually trigger validation to check fields
  const validateCardNumber = () => {
    const iframe = document.getElementById('CardComCardNumber') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: "validateCardNumber" }, '*');
    }
  };

  const validateCvv = () => {
    const iframe = document.getElementById('CardComCvv') as HTMLIFrameElement;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ action: "validateCvv" }, '*');
    }
  };

  const isValid = () => {
    return !validationState.cardNumberError &&
           !validationState.cvvError &&
           !validationState.cardholderNameError &&
           !validationState.idNumberError &&
           !validationState.expiryError &&
           validationState.isCardNumberValid &&
           validationState.isCvvValid &&
           cardholderName.length >= 2 &&
           cardOwnerId.length === 9 &&
           expiryMonth &&
           expiryYear;
  };

  return {
    ...validationState,
    isValid,
    validateCardNumber,
    validateCvv,
    validateIdNumber
  };
};
