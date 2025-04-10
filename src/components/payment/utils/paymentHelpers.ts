
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
  [key: string]: string | number | boolean;
}

// Helper function to create token data from card details
export const createTokenData = (
  cardNumber: string,
  expiryDate: string,
  cardholderName: string
): TokenData => {
  // Extract month/year from expiry date (MM/YY format)
  const [expiryMonth, expiryYear] = expiryDate.split('/');
  
  return {
    lastFourDigits: cardNumber.slice(-4),
    expiryMonth,
    expiryYear,
    cardholderName,
    tokenCreatedAt: new Date().toISOString(),
  };
};
