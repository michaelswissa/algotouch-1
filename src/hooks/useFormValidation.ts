
import { useState, useCallback } from 'react';

type ValidationFunction<T> = (name: string, value: any, formData?: T) => string | null;

interface ValidationState {
  [key: string]: string | null;
}

export function useFormValidation<T>(initialData: T, validationFunction: ValidationFunction<T>) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<ValidationState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const validateField = useCallback((name: string, value: any) => {
    return validationFunction(name, value, formData);
  }, [formData, validationFunction]);
  
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    const error = validateField(name, newValue);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);
  
  const setFieldValue = useCallback((name: string, value: any) => {
    setFormData(prev => ({ ...prev, [name]: value }));
    
    const error = validateField(name, value);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [validateField]);
  
  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationState = {};
    let isValid = true;
    
    // Validate all fields
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
  
  const handleSubmit = useCallback((onSubmit: (data: T) => void) => {
    return async (e: React.FormEvent) => {
      e.preventDefault();
      setIsSubmitting(true);
      
      const isValid = validateForm();
      
      if (isValid) {
        try {
          await onSubmit(formData);
        } catch (error) {
          console.error('Form submission error:', error);
        }
      }
      
      setIsSubmitting(false);
    };
  }, [formData, validateForm]);
  
  return {
    formData,
    errors,
    isSubmitting,
    handleChange,
    setFieldValue,
    validateForm,
    handleSubmit,
    setFormData
  };
}
