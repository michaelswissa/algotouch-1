
export interface SubscriptionPlan {
  name: string;
  price: number;
  description: string;
}

export const getSubscriptionPlans = (): Record<string, SubscriptionPlan> => {
  return {
    monthly: {
      name: 'חודשי',
      price: 99,
      description: 'חיוב חודשי לאחר חודש ניסיון',
    },
    annual: {
      name: 'שנתי',
      price: 899,
      description: 'חיוב שנתי לאחר חודש ניסיון',
    },
  };
};

export interface TokenData {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
}

export const createTokenData = (cardNumber: string, expiryDate: string, cardholderName: string): TokenData => {
  return {
    lastFourDigits: cardNumber.slice(-4),
    expiryMonth: expiryDate.split('/')[0],
    expiryYear: `20${expiryDate.split('/')[1]}`,
    cardholderName
  };
};
