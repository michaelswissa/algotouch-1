
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
      description: 'חיוב חודשי לאחר חודש ניסיון',
    },
    annual: {
      name: 'שנתי',
      price: 899,
      currency: '$',
      description: 'חיוב שנתי לאחר חודש ניסיון',
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
