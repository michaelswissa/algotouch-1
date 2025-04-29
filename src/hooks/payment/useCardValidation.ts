
import { useState, useCallback } from 'react';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

export const useCardValidation = () => {
  const [validationState, setValidationState] = useState({
    isCardNumberValid: false,
    isCvvValid: false,
    isReCaptchaValid: false,
    validationInProgress: false
  });
  
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const setFieldError = useCallback((field: string, error: string | null) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  }, []);

  const validateCardFields = useCallback((masterFrameRef: React.RefObject<HTMLIFrameElement>) => {
    setValidationState(prev => ({ ...prev, validationInProgress: true }));
    
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    const timeout = setTimeout(() => {
      setValidationState(prev => ({ ...prev, validationInProgress: false }));
    }, 10000);
    
    setValidationTimeout(timeout);
    
    const validateCardNumber = () => {
      const iframe = document.getElementById('CardComCardNumber') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ action: "validateCardNumber" }, '*');
      } else {
        setFieldError('cardNumber', 'שגיאה בטעינת שדה מספר כרטיס');
      }
    };

    const validateCvv = () => {
      const iframe = document.getElementById('CardComCvv') as HTMLIFrameElement;
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ action: "validateCvv" }, '*');
      } else {
        setFieldError('cvv', 'שגיאה בטעינת שדה קוד אבטחה');
      }
    };
    
    setFieldErrors({});
    validateCardNumber();
    validateCvv();
  }, [validationTimeout, setFieldError]);

  const handleValidationMessage = useCallback((message: MessageEvent) => {
    if (!message.origin.includes('cardcom.solutions') && 
        !message.origin.includes('localhost') && 
        !message.origin.includes(window.location.origin) &&
        !message.origin.includes('lovableproject.com') &&
        !message.origin.includes('lovable.app')) {
      return;
    }

    const data = message.data;
    if (!data || typeof data !== 'object' || data.action !== 'handleValidations') {
      return;
    }

    PaymentLogger.log('Received validation message:', data);

    switch (data.field) {
      case 'cardNumber':
        setValidationState(prev => ({ ...prev, isCardNumberValid: data.isValid }));
        setFieldError('cardNumber', data.isValid ? null : data.message || 'מספר כרטיס לא תקין');
        break;
        
      case 'cvv':
        setValidationState(prev => ({ ...prev, isCvvValid: data.isValid }));
        setFieldError('cvv', data.isValid ? null : data.message || 'קוד אבטחה לא תקין');
        break;
        
      case 'reCaptcha':
        setValidationState(prev => ({ ...prev, isReCaptchaValid: data.isValid }));
        break;
    }
  }, [setFieldError]);

  return {
    validationState,
    fieldErrors,
    validateCardFields,
    handleValidationMessage,
    setFieldError
  };
};
