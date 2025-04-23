
import { useState, useEffect } from 'react';

interface CardValidationState {
  cardNumberError: string;
  cardTypeInfo: string;
  cvvError: string;
  isCardNumberValid: boolean;
  isCvvValid: boolean;
}

export const useCardValidation = () => {
  const [validationState, setValidationState] = useState<CardValidationState>({
    cardNumberError: '',
    cardTypeInfo: '',
    cvvError: '',
    isCardNumberValid: false,
    isCvvValid: false
  });

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
        
        // Apply CSS classes
        const cardNumberIframe = document.getElementById('CardComCardNumber') as HTMLIFrameElement;
        if (cardNumberIframe?.contentWindow) {
          cardNumberIframe.contentWindow.postMessage({ 
            action: message.isValid ? 'removeCardNumberFieldClass' : 'addCardNumberFieldClass', 
            className: "invalid" 
          }, '*');
        }
        break;

      case 'cvv':
        setValidationState(prev => ({
          ...prev,
          isCvvValid: message.isValid,
          cvvError: message.isValid ? '' : (message.message || 'קוד אבטחה לא תקין')
        }));
        
        // Apply CSS classes
        const cvvIframe = document.getElementById('CardComCvv') as HTMLIFrameElement;
        if (cvvIframe?.contentWindow) {
          cvvIframe.contentWindow.postMessage({ 
            action: message.isValid ? 'removeCvvFieldClass' : 'addCvvFieldClass', 
            className: "invalid" 
          }, '*');
        }
        break;
    }
  };

  useEffect(() => {
    window.addEventListener('message', handleCardValidation);
    return () => window.removeEventListener('message', handleCardValidation);
  }, []);

  const validateCardNumber = () => {
    const iframe = document.getElementById('CardComCardNumber') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ action: "validateCardNumber" }, '*');
    }
  };

  const validateCvv = () => {
    const iframe = document.getElementById('CardComCvv') as HTMLIFrameElement;
    if (iframe?.contentWindow) {
      iframe.contentWindow.postMessage({ action: "validateCvv" }, '*');
    }
  };

  return {
    ...validationState,
    validateCardNumber,
    validateCvv,
  };
};

