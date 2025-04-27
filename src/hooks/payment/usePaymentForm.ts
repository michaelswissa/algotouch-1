
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
  const [cardValidationComplete, setCardValidationComplete] = useState(false);
  
  // Define validation rules using CardComService validators
  const validate = (name: string, value: string) => {
    const formData = {
      cardOwnerName: name === 'cardOwnerName' ? value : formData.cardOwnerName,
      cardOwnerId: name === 'cardOwnerId' ? value : formData.cardOwnerId,
      cardOwnerEmail: name === 'cardOwnerEmail' ? value : formData.cardOwnerEmail,
      cardOwnerPhone: name === 'cardOwnerPhone' ? value : formData.cardOwnerPhone,
      expirationMonth: name === 'expirationMonth' ? value : formData.expirationMonth,
      expirationYear: name === 'expirationYear' ? value : formData.expirationYear
    };
    
    const { errors } = CardComService.validateCardInfo(formData);
    return errors[name] || null;
  };
  
  // Initialize form validation
  const initialFormData: PaymentFormData = {
    cardOwnerName: '',
    cardOwnerId: '',
    cardOwnerEmail: '',
    cardOwnerPhone: '',
    expirationMonth: '',
    expirationYear: '',
    numberOfPayments: '1',
  };
  
  const {
    formData,
    errors,
    handleChange,
    validateForm,
    setFormData,
    setFieldError
  } = useFormValidation<PaymentFormData>(initialFormData, validate);
  
  // Monitor iframe messages for validation results
  useEffect(() => {
    const handleFrameMessages = (message: MessageEvent) => {
      // Safety check for message origin
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
  
      if (data.field === 'cardNumber' && !data.isValid) {
        // Set cardNumber validation error
        setFieldError('cardNumber', data.message || 'מספר כרטיס לא תקין');
      } else if (data.field === 'cvv' && !data.isValid) {
        // Set cvv validation error
        setFieldError('cvv', data.message || 'קוד אבטחה לא תקין');
      }

      if (data.field === 'reCaptcha' && data.isValid) {
        setCardValidationComplete(true);
      }
    };
    
    window.addEventListener('message', handleFrameMessages);
    return () => window.removeEventListener('message', handleFrameMessages);
  }, [setFieldError]);
  
  // Pre-fill form data if available
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
  
  const validateCardFields = () => {
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
    
    // Trigger iframe validations
    validateCardNumber();
    validateCvv();
  };
  
  const handleSubmitPayment = async () => {
    if (isSubmitting || paymentStatus === PaymentStatus.PROCESSING) {
      return;
    }
    
    // Validate form
    const isFormValid = validateForm();
    if (!isFormValid) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }
    
    // Validate card fields via iframe
    validateCardFields();
    
    if (!lowProfileCode) {
      toast.error('חסר מזהה יחודי לעסקה');
      return;
    }
    
    setIsSubmitting(true);
    PaymentLogger.log('Submitting payment', { 
      lowProfileCode,
      operationType
    });
    
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
    }
  };
  
  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmitPayment,
    validateCardFields
  };
}
