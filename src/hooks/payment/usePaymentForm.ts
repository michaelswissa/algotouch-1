
import { useFormValidation } from '@/hooks/useFormValidation';
import { usePaymentContext } from '@/contexts/payment/PaymentContext';
import { useState, useEffect } from 'react';
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
  
  // Define validation rules
  const validationRules = {
    cardOwnerName: (value: string) => 
      !value ? 'שם בעל הכרטיס הוא שדה חובה' : null,
    
    cardOwnerId: (value: string) => {
      if (!value) return 'תעודת זהות היא שדה חובה';
      if (!/^\d{9}$/.test(value)) return 'תעודת זהות חייבת להכיל 9 ספרות בדיוק';
      return null;
    },
    
    cardOwnerEmail: (value: string) => {
      if (!value) return 'דואר אלקטרוני הוא שדה חובה';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return 'יש להזין כתובת דואר אלקטרוני תקינה';
      return null;
    },
    
    cardOwnerPhone: (value: string) => {
      if (!value) return 'מספר טלפון הוא שדה חובה';
      if (!/^0\d{8,9}$/.test(value)) return 'יש להזין מספר טלפון ישראלי תקין';
      return null;
    },
    
    expirationMonth: (value: string) => 
      !value ? 'חודש תפוגה הוא שדה חובה' : null,
    
    expirationYear: (value: string) => 
      !value ? 'שנת תפוגה היא שדה חובה' : null,
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
    setFormData
  } = useFormValidation<PaymentFormData>(initialFormData, validationRules);
  
  // Pre-fill form data if available
  useEffect(() => {
    const registrationData = sessionStorage.getItem('registration_data');
    if (registrationData) {
      try {
        const data = JSON.parse(registrationData);
        if (data.email) {
          setFormData(prev => ({
            ...prev,
            cardOwnerEmail: data.email
          }));
        }
        
        if (data.userData) {
          const { firstName, lastName } = data.userData;
          if (firstName && lastName) {
            setFormData(prev => ({
              ...prev,
              cardOwnerName: `${firstName} ${lastName}`.trim()
            }));
          }
        }
      } catch (e) {
        console.error('Failed to parse registration data', e);
      }
    }
  }, [setFormData]);
  
  const handleSubmitPayment = async () => {
    if (isSubmitting) {
      return;
    }
    
    if (!validateForm()) {
      toast.error('יש לתקן את השגיאות בטופס');
      return;
    }
    
    if (!lowProfileCode) {
      toast.error('חסר מזהה יחודי לעסקה');
      return;
    }
    
    setIsSubmitting(true);
    
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
      console.error('Payment submission error:', error);
      toast.error('אירעה שגיאה בשליחת התשלום');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    handleSubmitPayment
  };
}
