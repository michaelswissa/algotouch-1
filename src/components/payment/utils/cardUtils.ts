
/**
 * Format card number with spaces for better readability
 * @param value Raw input value
 * @returns Formatted card number with spaces every 4 digits
 */
export const formatCardNumber = (value: string): string => {
  const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
  const matches = v.match(/\d{4,16}/g);
  const match = matches && matches[0] || '';
  const parts = [];
  
  for (let i = 0, len = match.length; i < len; i += 4) {
    parts.push(match.substring(i, i + 4));
  }
  
  if (parts.length) {
    return parts.join(' ');
  } else {
    return value;
  }
};

/**
 * Format expiry date as MM/YY
 * @param value Raw input value
 * @returns Formatted expiry date
 */
export const formatExpiryDate = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  
  if (cleaned.length === 0) {
    return '';
  } else if (cleaned.length <= 2) {
    return cleaned;
  } else {
    return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}`;
  }
};

/**
 * Detect card type based on number
 * @param cardNumber Card number
 * @returns Brand name of card
 */
export const detectCardType = (cardNumber: string): string => {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  
  // Visa
  if (/^4/.test(cleanNumber)) {
    return 'visa';
  }
  
  // Mastercard
  if (/^5[1-5]/.test(cleanNumber) || /^2[2-7]/.test(cleanNumber)) {
    return 'mastercard';
  }
  
  // AmEx
  if (/^3[47]/.test(cleanNumber)) {
    return 'amex';
  }
  
  // Discover
  if (/^6(?:011|5)/.test(cleanNumber)) {
    return 'discover';
  }
  
  // Diners
  if (/^3(?:0[0-5]|[68])/.test(cleanNumber)) {
    return 'diners';
  }
  
  // JCB
  if (/^35/.test(cleanNumber)) {
    return 'jcb';
  }
  
  return 'unknown';
};

/**
 * Simple validation for card number using Luhn algorithm
 * @param cardNumber Card number to validate
 * @returns Whether card passes basic validation
 */
export const validateCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s+/g, '');
  
  // Basic length check
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  // Luhn algorithm (mod 10 check)
  let sum = 0;
  let shouldDouble = false;
  
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
};

/**
 * Validate expiry date against current date
 * @param month Expiry month (1-12)
 * @param year Expiry year (2-digit or 4-digit)
 * @returns Whether the expiry date is valid and not in the past
 */
export const validateExpiryDate = (month: string, year: string): boolean => {
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // getMonth() is zero-based
  const currentYear = currentDate.getFullYear();
  
  let expiryYear = parseInt(year);
  const expiryMonth = parseInt(month);
  
  // Handle 2-digit years
  if (expiryYear < 100) {
    expiryYear += 2000; // Assume 21 -> 2021
  }
  
  // Basic validation
  if (isNaN(expiryMonth) || isNaN(expiryYear) || 
      expiryMonth < 1 || expiryMonth > 12) {
    return false;
  }
  
  // Check if expired
  if (expiryYear < currentYear || 
      (expiryYear === currentYear && expiryMonth < currentMonth)) {
    return false;
  }
  
  return true;
};

/**
 * Validate CVV based on card type
 * @param cvv CVV code
 * @param cardType Type of card (amex requires 4 digits, others require 3)
 * @returns Whether CVV is valid length
 */
export const validateCVV = (cvv: string, cardType: string = 'unknown'): boolean => {
  const cleanCVV = cvv.replace(/\D/g, '');
  
  if (cardType === 'amex') {
    return cleanCVV.length === 4;
  }
  
  return cleanCVV.length === 3;
};
