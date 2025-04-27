
import { useState, useEffect } from 'react';
import { usePaymentContext } from '@/contexts/payment/PaymentContext';
import { CardComService } from '@/services/payment/CardComService';
import { toast } from 'sonner';

interface PaymentFormData {
  cardOwnerName: string;
  cardOwnerId: string;
  cardOwnerEmail: string;
  cardOwnerPhone: string;
  cardMonth: string;
  cardYear: string;
}

interface PaymentFormErrors {
  cardOwnerName?: string;
  cardOwnerId?: string;
  cardOwnerEmail?: string;
  cardOwnerPhone?: string;
  cardMonth?: string;
  cardYear?: string;
  cardNumber?: string;
  cvv?: string;
}

export const usePaymentForm = () => {
  const [formData, setFormData] = useState<PaymentFormData>({
    cardOwnerName: '',
    cardOwnerId: '',
    cardOwnerEmail: '',
    cardOwnerPhone: '',
    cardMonth: '',
    cardYear: ''
  });
  
  const [errors, setErrors] = useState<PaymentFormErrors>({});
  const { submitPayment, paymentStatus } = usePaymentContext();
  
  // Load data from session storage if available
  useEffect(() => {
    try {
      const contractData = sessionStorage.getItem('contract_data');
      const registrationData = sessionStorage.getItem('registration_data');
      
      if (contractData) {
        const parsed = JSON.parse(contractData);
        if (parsed.fullName || parsed.email) {
          setFormData(prev => ({
            ...prev,
            cardOwnerName: parsed.fullName || prev.cardOwnerName,
            cardOwnerEmail: parsed.email || prev.cardOwnerEmail
          }));
        }
      } else if (registrationData) {
        const parsed = JSON.parse(registrationData);
        if (parsed.userData || parsed.email) {
          const name = parsed.userData?.firstName && parsed.userData?.lastName ? 
            `${parsed.userData.firstName} ${parsed.userData.lastName}` : '';
          
          setFormData(prev => ({
            ...prev,
            cardOwnerName: name || prev.cardOwnerName,
            cardOwnerEmail: parsed.email || prev.cardOwnerEmail,
            cardOwnerPhone: parsed.userData?.phone || prev.cardOwnerPhone
          }));
        }
      }
    } catch (e) {
      console.error('Error loading form data from storage', e);
    }
  }, []);
  
  const validateForm = () => {
    const newErrors: PaymentFormErrors = {};
    let isValid = true;
    
    // Validate name
    if (!formData.cardOwnerName.trim()) {
      newErrors.cardOwnerName = 'שדה חובה';
      isValid = false;
    }
    
    // Validate email
    if (!formData.cardOwnerEmail.trim()) {
      newErrors.cardOwnerEmail = 'שדה חובה';
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.cardOwnerEmail)) {
      newErrors.cardOwnerEmail = 'כתובת דוא"ל לא תקינה';
      isValid = false;
    }
    
    // Validate ID
    if (formData.cardOwnerId.trim() && !/^\d{9}$/.test(formData.cardOwnerId)) {
      newErrors.cardOwnerId = 'מספר זהות לא תקין';
      isValid = false;
    }
    
    // Validate phone
    if (formData.cardOwnerPhone.trim() && !/^0\d{8,9}$/.test(formData.cardOwnerPhone)) {
      newErrors.cardOwnerPhone = 'מספר טלפון לא תקין';
      isValid = false;
    }
    
    // Validate card month/year
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear() % 100;
    const currentMonth = currentDate.getMonth() + 1;
    
    if (formData.cardYear && formData.cardMonth) {
      const year = parseInt(formData.cardYear);
      const month = parseInt(formData.cardMonth);
      
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        newErrors.cardMonth = 'כרטיס פג תוקף';
        isValid = false;
      }
    }
    
    setErrors(newErrors);
    return isValid;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name as keyof PaymentFormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };
  
  const handleSubmit = () => {
    if (!validateForm()) {
      toast.error('יש למלא את כל שדות החובה');
      return;
    }
    
    submitPayment({
      cardOwnerName: formData.cardOwnerName,
      cardOwnerId: formData.cardOwnerId,
      cardOwnerEmail: formData.cardOwnerEmail,
      cardOwnerPhone: formData.cardOwnerPhone,
      expirationMonth: formData.cardMonth,
      expirationYear: formData.cardYear,
    });
  };
  
  return {
    formData,
    errors,
    handleChange,
    handleSubmit,
    isSubmitting: paymentStatus === 'processing'
  };
};
