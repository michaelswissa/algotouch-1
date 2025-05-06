
import { useState, useCallback } from 'react';
import { ValidationErrors } from '@/types/auth';
import { validateForm as validateFormUtil, ValidationRule } from '@/utils/form-validation';

export function useFormValidation<T extends Record<string, any>>(
  initialData: T, 
  validationRules: Record<keyof T, ValidationRule>
) {
  const [formData, setFormData] = useState<T>(initialData);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const validateField = useCallback((name: string, value: any) => {
    const rule = validationRules[name as keyof T];
    return rule ? rule(value, formData) : null;
  }, [formData, validationRules]);
  
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
    const newErrors = validateFormUtil(formData, validationRules);
    setErrors(newErrors);
    return Object.values(newErrors).every(error => !error);
  }, [formData, validationRules]);
  
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
