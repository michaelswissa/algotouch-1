
import { useState, useEffect, useCallback } from 'react';
import { CardOwnerDetails } from '@/types/payment';

export function usePaymentForm() {
  const initialFormData: CardOwnerDetails = {
    cardOwnerName: '',
    cardOwnerId: '',
    cardOwnerEmail: '',
    cardOwnerPhone: '',
    expirationMonth: '',
    expirationYear: ''
  };

  const [formData, setFormData] = useState<CardOwnerDetails>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form validation rules
  const validateField = useCallback((name: string, value: string) => {
    switch (name) {
      case 'cardOwnerName':
        return !value.trim() ? 'נא להזין שם מלא' : '';
      
      case 'cardOwnerId':
        if (!value) return 'נא להזין תעודת זהות';
        if (!/^\d{9}$/.test(value)) return 'תעודת זהות חייבת להכיל 9 ספרות';
        return '';
      
      case 'cardOwnerEmail':
        if (!value) return 'נא להזין כתובת דוא"ל';
        if (!/\S+@\S+\.\S+/.test(value)) return 'כתובת דוא"ל לא תקינה';
        return '';
      
      case 'cardOwnerPhone':
        if (!value) return 'נא להזין מספר טלפון';
        if (!/^0\d{8,9}$/.test(value.replace(/[-\s]/g, ''))) {
          return 'מספר טלפון לא תקין';
        }
        return '';
      
      case 'expirationMonth':
        return !value ? 'נא לבחור חודש' : '';
      
      case 'expirationYear':
        return !value ? 'נא לבחור שנה' : '';
      
      default:
        return '';
    }
  }, []);

  // Handle field changes
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({ ...prev, [name]: value }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ 
      ...prev, 
      [name]: error
    }));
  }, [validateField]);

  // Listen for frame messages from CardCom iframes
  useEffect(() => {
    const handleFrameMessages = (message: MessageEvent) => {
      if (!message.origin.includes('cardcom.solutions') && 
          !message.origin.includes('localhost') && 
          !message.origin.includes(window.location.origin) &&
          !message.origin.includes('lovableproject.com') &&
          !message.origin.includes('lovable.app')) {
        return;
      }
  
      try {
        const data = message.data;
        
        if (data && data.action === 'validation') {
          // Handle validation messages
          console.log('Received validation message from CardCom:', data);
        }
      } catch (error) {
        console.error('Error handling frame message:', error);
      }
    };
  
    window.addEventListener('message', handleFrameMessages);
    return () => window.removeEventListener('message', handleFrameMessages);
  }, []);

  // Validate entire form
  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    let isValid = true;
    
    // Validate each field
    Object.entries(formData).forEach(([name, value]) => {
      const error = validateField(name, value);
      if (error) {
        isValid = false;
        newErrors[name] = error;
      }
    });
    
    setErrors(newErrors);
    return isValid;
  }, [formData, validateField]);

  // Reset form data
  const resetForm = useCallback(() => {
    setFormData(initialFormData);
    setErrors({});
  }, []);

  return {
    formData,
    errors,
    handleChange,
    validateForm,
    resetForm,
    setFormData
  };
}
