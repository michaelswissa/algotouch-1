import { useState, useEffect } from 'react';
import { usePaymentContext } from '@/contexts/payment/PaymentContext';
import { PaymentStatus } from '@/components/payment/types/payment';
import { CardComService } from '@/services/payment/CardComService';
import { useFormValidation } from '@/hooks/useFormValidation';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';

interface PaymentFormData {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
  numberOfPayments: string;
}

export function usePaymentForm() {
  const { 
    paymentStatus, 
    submitPayment, 
    lowProfileCode, 
    terminalNumber, 
    operationType 
  } = usePaymentContext();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationState, setValidationState] = useState({
    isCardNumberValid: false,
    isCvvValid: false,
    isReCaptchaValid: false,
    validationInProgress: false
  });
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);
  
  const initialFormData: PaymentFormData = {
    cardOwnerName: '',
    cardOwnerId: '',
    cardOwnerEmail: '',
    cardOwnerPhone: '',
    expirationMonth: '',
    expirationYear: '',
    numberOfPayments: '1',
  };
  
  const validateField = (name: string, value: string, currentFormData: PaymentFormData): string | null => {
    const dataToValidate = {
      cardOwnerName: name === 'cardOwnerName' ? value : currentFormData.cardOwnerName,
      cardOwnerId: name === 'cardOwnerId' ? value : currentFormData.cardOwnerId,
      cardOwnerEmail: name === 'cardOwnerEmail' ? value : currentFormData.cardOwnerEmail,
      cardOwnerPhone: name === 'cardOwnerPhone' ? value : currentFormData.cardOwnerPhone,
      expirationMonth: name === 'expirationMonth' ? value : currentFormData.expirationMonth,
      expirationYear: name === 'expirationYear' ? value : currentFormData.expirationYear
    };
    
    const { errors } = CardComService.validateCardInfo(dataToValidate);
    return errors[name] || null;
  };
  
  const {
    formData,
    errors,
    handleChange,
    validateForm,
    setFormData,
    setFieldValue
  } = useFormValidation<PaymentFormData>(initialFormData, validateField);
  
  const setFieldError = (field: string, error: string | null) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: error || ''
    }));
  };

  useEffect(() => {
    const handleFrameMessages = (message: MessageEvent) => {
      if (!message.origin.includes('cardcom.solutions') && 
          !message.origin.includes('localhost') && 
          !message.origin.includes(window.location.origin)) {
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
          if (!data.isValid) {
            setFieldError('cardNumber', data.message || 'מספר כרטיס לא תקין');
          } else {
            setFieldError('cardNumber', null);
          }
          break;
          
        case 'cvv':
          setValidationState(prev => ({ ...prev, isCvvValid: data.isValid }));
          if (!data.isValid) {
            setFieldError('cvv', data.message || 'קוד אבטחה ��א תקין');
          } else {
            setFieldError('cvv', null);
          }
          break;
          
        case 'reCaptcha':
          setValidationState(prev => ({ ...prev, isReCaptchaValid: data.isValid }));
          break;
      }
    };
    
    window.addEventListener('message', handleFrameMessages);
    return () => window.removeEventListener('message', handleFrameMessages);
  }, []);
  
  const startValidationTimeout = () => {
    if (validationTimeout) {
      clearTimeout(validationTimeout);
    }
    
    const timeout = setTimeout(() => {
      setValidationState(prev => ({ ...prev, validationInProgress: false }));
      if (!validationState.isCardNumberValid || !validationState.isCvvValid) {
        toast.error('לא התקבלה תשובה מאימות הכרטיס, אנא נסה שנית');
      }
    }, 10000); // 10 second timeout
    
    setValidationTimeout(timeout);
  };
  
  const validateCardFields = () => {
    setValidationState(prev => ({ ...prev, validationInProgress: true }));
    startValidationTimeout();
    
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
  };
  
  const handleSubmitPayment = async () => {
    if (isSubmitting || paymentStatus === PaymentStatus.PROCESSING) {
      return;
    }
    
    const isFormValid = validateForm();
    if (!isFormValid) {
      const errorMessages = Object.values(errors).filter(e => e).join(', ');
      toast.error(`יש לתקן את השגיאות בטופס: ${errorMessages}`);
      PaymentLogger.warn('Form validation failed', errors);
      return;
    }
    
    if (fieldErrors.cardNumber || fieldErrors.cvv) {
      const iframeErrors = [fieldErrors.cardNumber, fieldErrors.cvv].filter(Boolean).join(', ');
      toast.error(`שגיאות באימות כרטיס: ${iframeErrors}`);
      PaymentLogger.warn('Card validation failed', fieldErrors);
      return;
    }
    
    validateCardFields();
    
    setValidationState(prev => ({ ...prev, validationInProgress: true }));
    
    if (!validationState.isReCaptchaValid) {
      toast.error('אנא השלם את אימות האנושי');
      return;
    }
    
    if (!lowProfileCode) {
      toast.error('חסר מזהה יחודי לעסקה');
      PaymentLogger.error('Missing lowProfileCode on submit');
      return;
    }
    
    setIsSubmitting(true);
    PaymentLogger.log('Submitting payment', { lowProfileCode, operationType });
    
    try {
      await submitPayment({
        cardOwnerName: formData.cardOwnerName,
        cardOwnerId: formData.cardOwnerId,
        cardOwnerEmail: formData.cardOwnerEmail,
        cardOwnerPhone: formData.cardOwnerPhone,
        expirationMonth: formData.expirationMonth,
        expirationYear: formData.expirationYear,
      });
    } catch (error) {
      PaymentLogger.error('Payment submission error:', error);
      toast.error(error instanceof Error ? error.message : 'אירעה שגיאה בשליחת התשלום');
    } finally {
      setIsSubmitting(false);
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }
    }
  };
  
  useEffect(() => {
    const registrationDataStr = sessionStorage.getItem('registration_data');
    const contractDataStr = sessionStorage.getItem('contract_data');
    
    try {
      if (contractDataStr) {
        const contractData = JSON.parse(contractDataStr);
        
        if (contractData.email) {
          setFormData(prev => ({
            ...prev,
            cardOwnerEmail: contractData.email
          }));
        }
        
        if (contractData.fullName) {
          setFormData(prev => ({
            ...prev,
            cardOwnerName: contractData.fullName
          }));
        }
        
        if (contractData.phone) {
          setFormData(prev => ({
            ...prev,
            cardOwnerPhone: contractData.phone
          }));
        }
        
        if (contractData.id_number) {
          setFormData(prev => ({
            ...prev,
            cardOwnerId: contractData.id_number
          }));
        }
        
      } else if (registrationDataStr) {
        const data = JSON.parse(registrationDataStr);
        if (data.email) {
          setFormData(prev => ({
            ...prev,
            cardOwnerEmail: data.email
          }));
        }
        
        if (data.userData) {
          const { firstName, lastName, phone } = data.userData;
          if (firstName && lastName) {
            setFormData(prev => ({
              ...prev,
              cardOwnerName: `${firstName} ${lastName}`.trim()
            }));
          }
          
          if (phone) {
            setFormData(prev => ({
              ...prev,
              cardOwnerPhone: phone
            }));
          }
        }
      }
    } catch (e) {
      PaymentLogger.error('Failed to parse registration/contract data', e);
    }
  }, [setFormData]);
  
  const combinedErrors = { ...errors, ...fieldErrors };
  
  return {
    formData,
    errors: combinedErrors,
    isSubmitting,
    handleChange,
    handleSubmitPayment,
    validateCardFields,
    setFieldError,
    validationState
  };
}
