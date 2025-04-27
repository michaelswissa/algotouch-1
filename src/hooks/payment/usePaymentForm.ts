
import { useState, useCallback } from 'react';

export interface PaymentFormData {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  cardMonth: string;
  cardYear: string;
  expirationMonth: string;
  expirationYear: string;
}

export interface PaymentFormErrors {
  cardOwnerName?: string;
  cardOwnerId?: string;
  cardOwnerEmail?: string;
  cardOwnerPhone?: string;
  cardMonth?: string;
  cardYear?: string;
  cardNumber?: string;
  cvv?: string;
  expirationMonth?: string;
  expirationYear?: string;
}

export interface CardOwnerDetails {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  expirationMonth: string;
  expirationYear: string;
}

export const usePaymentForm = () => {
  const [formData, setFormData] = useState<PaymentFormData>({
    cardOwnerName: '',
    cardOwnerId: '',
    cardOwnerEmail: '',
    cardOwnerPhone: '',
    cardMonth: '',
    cardYear: '',
    expirationMonth: '',
    expirationYear: ''
  });
  
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  
  const validateForm = useCallback((): boolean => {
    const newErrors: PaymentFormErrors = {};
    let isValid = true;
    
    // Card owner name validation
    if (!formData.cardOwnerName) {
      newErrors.cardOwnerName = 'שדה חובה';
      isValid = false;
    }
    
    // ID validation (9 digits for Israeli ID)
    if (!formData.cardOwnerId) {
      newErrors.cardOwnerId = 'שדה חובה';
      isValid = false;
    } else if (!/^\d{9}$/.test(formData.cardOwnerId)) {
      newErrors.cardOwnerId = 'תעודת זהות לא תקינה, נדרשים 9 ספרות';
      isValid = false;
    }
    
    // Email validation
    if (!formData.cardOwnerEmail) {
      newErrors.cardOwnerEmail = 'שדה חובה';
      isValid = false;
    } else if (!/^\S+@\S+\.\S+$/.test(formData.cardOwnerEmail)) {
      newErrors.cardOwnerEmail = 'כתובת דואר אלקטרוני לא תקינה';
      isValid = false;
    }
    
    // Phone validation
    if (!formData.cardOwnerPhone) {
      newErrors.cardOwnerPhone = 'שדה חובה';
      isValid = false;
    } else if (!/^0\d{8,9}$/.test(formData.cardOwnerPhone.replace(/[-\s]/g, ''))) {
      newErrors.cardOwnerPhone = 'מספר טלפון לא תקין';
      isValid = false;
    }
    
    // Card expiration validation
    const month = formData.expirationMonth || formData.cardMonth;
    const year = formData.expirationYear || formData.cardYear;

    if (!month || !year) {
      newErrors.expirationMonth = 'שדה חובה';
      isValid = false;
    } else {
      // Check if card is expired
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear() % 100;
      const currentMonth = currentDate.getMonth() + 1;
      
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      
      if (yearNum < currentYear || (yearNum === currentYear && monthNum < currentMonth)) {
        newErrors.expirationMonth = 'כרטיס פג תוקף';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  }, [formData]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // If the name is expirationMonth or expirationYear, also update the corresponding cardMonth/Year fields
    if (name === 'expirationMonth') {
      setFormData(prev => ({ ...prev, cardMonth: value }));
    } else if (name === 'expirationYear') {
      setFormData(prev => ({ ...prev, cardYear: value }));
    }
    
    // Clear error for this field
    if (errors[name as keyof PaymentFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const submitForm = useCallback(() => {
    const isValid = validateForm();
    if (!isValid) {
      return false;
    }
    
    return ({
      cardOwnerName: formData.cardOwnerName,
      cardOwnerId: formData.cardOwnerId,
      cardOwnerEmail: formData.cardOwnerEmail,
      cardOwnerPhone: formData.cardOwnerPhone,
      expirationMonth: formData.expirationMonth || formData.cardMonth,
      expirationYear: formData.expirationYear || formData.cardYear,
    });
  }, [formData, validateForm]);
  
  return {
    formData,
    errors,
    handleChange,
    validateForm,
    submitForm
  };
};
