
export interface SubscriptionPlan {
  name: string;
  price: number;
  description: string;
  currency?: string;
}

export const getSubscriptionPlans = (): Record<string, SubscriptionPlan> => {
  return {
    monthly: {
      name: 'חודשי',
      price: 99,
      currency: '$',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
    },
    annual: {
      name: 'שנתי',
      price: 899,
      currency: '$',
      description: '25% הנחה | שלושה חודשים מתנה',
    },
    vip: {
      name: 'VIP',
      price: 3499,
      currency: '$',
      description: 'גישה לכל החיים בתשלום חד פעמי',
    },
  };
};

// Updated to include index signature to make it compatible with Json type
export interface TokenData {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  [key: string]: string | number | boolean | null | TokenData[]; // Adding index signature for Json compatibility
}

export const createTokenData = (cardNumber: string, expiryDate: string, cardholderName: string): TokenData => {
  return {
    lastFourDigits: cardNumber.slice(-4),
    expiryMonth: expiryDate.split('/')[0],
    expiryYear: `20${expiryDate.split('/')[1]}`,
    cardholderName
  };
};

// Function to determine credit card type based on number prefix
export const getCreditCardType = (cardNumber: string): string => {
  // Remove all non-digit characters
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Card type patterns
  const patterns = {
    visa: /^4/,
    mastercard: /^(5[1-5]|2[2-7])/,
    amex: /^3[47]/,
    discover: /^(6011|65|64[4-9]|622)/,
    diners: /^(36|38|30[0-5])/
  };
  
  // Check each pattern
  if (patterns.visa.test(cleanNumber)) return 'visa';
  if (patterns.mastercard.test(cleanNumber)) return 'mastercard';
  if (patterns.amex.test(cleanNumber)) return 'amex';
  if (patterns.discover.test(cleanNumber)) return 'discover';
  if (patterns.diners.test(cleanNumber)) return 'diners';
  
  // Default
  return '';
};

// Function to validate credit card number using Luhn algorithm
export const isValidCardNumber = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\D/g, '');
  
  // Check if the number is valid length
  if (cleanNumber.length < 13 || cleanNumber.length > 19) {
    return false;
  }
  
  // Luhn algorithm
  let sum = 0;
  let shouldDouble = false;
  
  // Loop from right to left
  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber.charAt(i));
    
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  
  return sum % 10 === 0;
};

// Function to validate expiry date
export const isValidExpiryDate = (expiryDate: string): boolean => {
  const regex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  
  if (!regex.test(expiryDate)) {
    return false;
  }
  
  const [month, year] = expiryDate.split('/');
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear() % 100;
  const currentMonth = currentDate.getMonth() + 1;
  
  const expiryYear = parseInt(year, 10);
  const expiryMonth = parseInt(month, 10);
  
  // Check if the card is expired
  return (expiryYear > currentYear) || 
         (expiryYear === currentYear && expiryMonth >= currentMonth);
};

// Function to validate CVV
export const isValidCVV = (cvv: string, cardType: string): boolean => {
  const cleanCVV = cvv.replace(/\D/g, '');
  
  if (cardType === 'amex') {
    return cleanCVV.length === 4;
  }
  
  return cleanCVV.length === 3;
};
