
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';

interface SignupFormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

interface ValidationErrors {
  [key: string]: string;
}

export const useSignupForm = () => {
  const navigate = useNavigate();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateForm = (data: SignupFormData): boolean => {
    const newErrors: ValidationErrors = {};
    
    if (!data.firstName.trim()) newErrors.firstName = 'שדה חובה';
    if (!data.lastName.trim()) newErrors.lastName = 'שדה חובה';
    
    if (!data.email.trim()) {
      newErrors.email = 'שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      newErrors.email = 'כתובת מייל לא תקינה';
    }
    
    if (!data.password) {
      newErrors.password = 'שדה חובה';
    } else if (data.password.length < 6) {
      newErrors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
    }
    
    if (data.phone && !/^0[2-9]\d{7,8}$/.test(data.phone)) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (formData: SignupFormData) => {
    if (!validateForm(formData)) {
      return;
    }
    
    try {
      setIsProcessing(true);
      PaymentLogger.log('Starting registration process', { 
        email: formData.email,
        hasUserData: true,
      });
      
      // First clear any existing registration data
      StorageService.clearAllSubscriptionData();
      
      const registrationData = {
        email: formData.email,
        password: formData.password,
        userData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone
        },
        registrationTime: new Date().toISOString(),
        userCreated: false,
      };
      
      // Store registration data
      const storedSuccessfully = StorageService.storeRegistrationData(registrationData);
      
      if (!storedSuccessfully) {
        throw new Error('שגיאה בשמירת נתוני הרשמה');
      }
      
      PaymentLogger.log('Registration data saved successfully');
      toast.success('הפרטים נשמרו בהצלחה');
      
      // Redirect to subscription page
      navigate('/subscription', { 
        replace: true, 
        state: { isRegistering: true } 
      });
    } catch (error: any) {
      PaymentLogger.error('Signup error:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך ההרשמה');
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    handleSignup,
    errors,
    isProcessing,
  };
};
