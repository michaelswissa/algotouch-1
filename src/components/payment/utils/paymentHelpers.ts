
import { clearNumber } from './stringUtils';

export const getCreditCardType = (cardNumber: string): string => {
  // Regular expressions for different card types
  const patterns = {
    visa: /^4/,
    mastercard: /^(5[1-5]|2[2-7])/,
    amex: /^3[47]/,
    discover: /^(6011|65|64[4-9]|622)/,
    diners: /^(30[0-5]|36|38)/,
    jcb: /^35/,
    unionpay: /^(62|88)/,
  };

  // Find matching card type
  for (const type in patterns) {
    if (patterns[type as keyof typeof patterns].test(cardNumber)) {
      return type;
    }
  }

  return 'unknown';
};

export const formatCreditCardNumber = (value: string): string => {
  if (!value) return '';

  const cardNumber = clearNumber(value);
  const cardType = getCreditCardType(cardNumber);

  // Format differently for Amex (4-6-5 format)
  if (cardType === 'amex') {
    const groups = [
      cardNumber.substring(0, 4),
      cardNumber.substring(4, 10),
      cardNumber.substring(10, 15),
    ];
    return groups.filter(Boolean).join(' ');
  } 

  // Default format (4-4-4-4)
  const parts = [];
  for (let i = 0; i < cardNumber.length; i += 4) {
    parts.push(cardNumber.substring(i, i + 4));
  }
  return parts.join(' ').trim();
};

export const formatExpirationDate = (value: string): string => {
  const clearValue = clearNumber(value);
  
  if (clearValue.length >= 3) {
    return `${clearValue.slice(0, 2)}/${clearValue.slice(2, 4)}`;
  }
  
  return clearValue;
};

export const formatCVV = (value: string): string => {
  const clearValue = clearNumber(value);
  return clearValue.slice(0, 4);
};

export const getSubscriptionPlans = () => {
  return {
    monthly: {
      name: "חודשי",
      price: "$99",
      description: "מנוי חודשי עם חודש ראשון חינם",
    },
    annual: {
      name: "שנתי",
      price: "$899",
      description: "מנוי שנתי בהנחה של 25% מהמחיר החודשי",
    },
    vip: {
      name: "VIP",
      price: "$3,499",
      description: "מנוי לכל החיים עם גישה לכל התכנים",
    },
  };
};

export const createTokenData = (cardNumber: string, expiryDate: string, cardholderName: string) => {
  // Just prepare a token payload structure - no actual token processing here
  // In a real app, this would integrate with a payment processor's API
  const [month, year] = expiryDate.split('/');
  
  return {
    cardLast4: cardNumber.replace(/\s/g, '').slice(-4),
    cardType: getCreditCardType(cardNumber.replace(/\s/g, '')),
    expiryMonth: month,
    expiryYear: `20${year}`,
    cardholderName,
  };
};

// Helper function to validate credit card
export const validateCreditCard = (cardNumber: string): boolean => {
  // Remove spaces and non-digits
  const value = cardNumber.replace(/\D/g, '');
  
  // Check if empty or less than 13 digits
  if (!value || value.length < 13) return false;
  
  // Luhn algorithm (mod 10)
  let sum = 0;
  let shouldDouble = false;
  
  // Loop from right to left
  for (let i = value.length - 1; i >= 0; i--) {
    let digit = parseInt(value.charAt(i), 10);
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
};
