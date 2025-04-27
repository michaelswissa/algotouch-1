
import { useState } from 'react';

export interface PaymentFormData {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
}

export interface PaymentFormErrors {
  cardOwnerName?: string;
  cardOwnerId?: string;
  cardOwnerEmail?: string;
  cardOwnerPhone?: string;
  expirationMonth?: string;
  expirationYear?: string;
}

export const usePaymentForm = () => {
  const [formData, setFormData] = useState<PaymentFormData>({
    cardOwnerName: '',
    cardOwnerId: '',
    cardOwnerEmail: '',
    cardOwnerPhone: '',
    expirationMonth: '',
    expirationYear: ''
  });
  
  const [errors, setErrors] = useState<PaymentFormErrors>({});

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateIdNumber = (id: string): boolean => {
    // Basic Israeli ID validation (9 digits)
    return /^\d{9}$/.test(id);
  };

  const validatePhone = (phone: string): boolean => {
    // Basic Israeli phone validation (starts with 05 and has 10 digits total)
    return /^05\d{8}$/.test(phone);
  };

  const validateField = (name: keyof PaymentFormData, value: string): string | undefined => {
    switch (name) {
      case 'cardOwnerName':
        return value.trim().length < 2 ? 'שם בעל הכרטיס חייב להכיל לפחות 2 תווים' : undefined;
      case 'cardOwnerId':
        return !validateIdNumber(value) ? 'מספר תעודת זהות לא תקין (9 ספרות)' : undefined;
      case 'cardOwnerEmail':
        return !validateEmail(value) ? 'כתובת דוא"ל לא תקינה' : undefined;
      case 'cardOwnerPhone':
        return !validatePhone(value) ? 'מספר טלפון לא תקין (דוגמה: 0501234567)' : undefined;
      case 'expirationMonth':
        return value === '' ? 'יש לבחור חודש תפוגה' : undefined;
      case 'expirationYear':
        return value === '' ? 'יש לבחור שנת תפוגה' : undefined;
      default:
        return undefined;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Validate field
    const fieldError = validateField(name as keyof PaymentFormData, value);
    
    // Update errors state
    setErrors(prev => ({
      ...prev,
      [name]: fieldError
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: PaymentFormErrors = {};
    let isValid = true;
    
    // Validate all fields
    Object.entries(formData).forEach(([key, value]) => {
      const fieldName = key as keyof PaymentFormData;
      const fieldError = validateField(fieldName, value);
      
      if (fieldError) {
        newErrors[fieldName] = fieldError;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  };

  return {
    formData,
    errors,
    handleChange,
    validateForm
  };
};
