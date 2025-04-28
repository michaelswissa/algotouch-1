
import { CardOwnerDetails } from '@/types/payment';

export const validateCardOwnerDetails = (details: Partial<CardOwnerDetails>) => {
  const errors: Record<string, string> = {};
  
  if (!details.cardOwnerName?.trim()) {
    errors.cardOwnerName = 'שם בעל הכרטיס הוא שדה חובה';
  } else if (details.cardOwnerName?.trim().length < 2) {
    errors.cardOwnerName = 'שם בעל הכרטיס קצר מדי';
  }
  
  if (!details.cardOwnerId?.trim()) {
    errors.cardOwnerId = 'מספר תעודת זהות הוא שדה חובה';
  } else if (!/^\d{9}$/.test(details.cardOwnerId)) {
    errors.cardOwnerId = 'מספר תעודת זהות צריך להכיל 9 ספרות בדיוק';
  }
  
  if (!details.cardOwnerEmail?.trim()) {
    errors.cardOwnerEmail = 'דוא"ל הוא שדה חובה';
  } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(details.cardOwnerEmail)) {
    errors.cardOwnerEmail = 'כתובת דוא"ל לא תקינה';
  }
  
  if (!details.cardOwnerPhone?.trim()) {
    errors.cardOwnerPhone = 'מספר טלפון הוא שדה חובה';
  } else if (!/^0\d{8,9}$/.test(details.cardOwnerPhone.replace(/[- ]/g, ''))) {
    errors.cardOwnerPhone = 'מספר טלפון לא תקין';
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};

export const validateCardExpiry = (month?: string, year?: string) => {
  const errors: Record<string, string> = {};
  
  if (month) {
    if (!/^(0[1-9]|1[0-2])$/.test(month)) {
      errors.expirationMonth = 'חודש לא תקין';
    }
  }
  
  if (year) {
    const currentYear = new Date().getFullYear() % 100;
    const yearNum = parseInt(year);
    
    if (isNaN(yearNum) || yearNum < currentYear || yearNum > currentYear + 20) {
      errors.expirationYear = 'שנה לא תקינה';
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
};
