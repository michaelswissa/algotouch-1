
import { ValidationErrors } from '@/types/auth';

export type ValidationRule = (value: any, formData?: any) => string | null;

/**
 * Validate email format
 */
export const validateEmail = (email: string): string | null => {
  if (!email) return 'נדרשת כתובת אימייל';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'נדרשת כתובת אימייל תקינה';
  return null;
};

/**
 * Validate password requirements
 */
export const validatePassword = (password: string): string | null => {
  if (!password) return 'נדרשת סיסמה';
  if (password.length < 6) return 'הסיסמה חייבת להכיל לפחות 6 תווים';
  return null;
};

/**
 * Validate name fields
 */
export const validateName = (name: string, fieldName: string): string | null => {
  if (!name) return `נדרש ${fieldName}`;
  if (name.length < 2) return `${fieldName} חייב להכיל לפחות 2 תווים`;
  return null;
};

/**
 * Validate phone number (optional field)
 */
export const validatePhone = (phone: string): string | null => {
  if (!phone) return null; // Phone is optional
  if (!/^0[2-9]\d{7,8}$/.test(phone)) return 'מספר טלפון לא תקין';
  return null;
};

/**
 * Validate an entire form object using the provided validation rules
 */
export const validateForm = <T extends Record<string, any>>(
  formData: T,
  validationRules: Record<keyof T, ValidationRule>
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(validationRules).forEach((field) => {
    const key = field as keyof T;
    const rule = validationRules[key];
    const error = rule(formData[key], formData);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

/**
 * Check if a validation errors object has any errors
 */
export const hasErrors = (errors: ValidationErrors): boolean => {
  return Object.values(errors).some(error => !!error);
};
