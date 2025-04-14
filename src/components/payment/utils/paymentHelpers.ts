
export interface SubscriptionPlan {
  name: string;
  price: number;
  description: string;
  currency?: string;
  displayPrice?: number;
  features?: string[];
  hasTrial?: boolean;
}

// Define proper subscription plans with the structure expected by the components
export const getSubscriptionPlans = () => {
  return {
    monthly: {
      name: 'חודשי',
      price: 371,
      displayPrice: 99,
      description: 'חודש ניסיון חינם, אחר כך חיוב אוטומטי של 371 ₪ לחודש.',
      features: ['גישה לכל התכונות', 'ביטול בכל עת', 'עדכונים שוטפים'],
      hasTrial: true,
    },
    annual: {
      name: 'שנתי',
      price: 3371,
      displayPrice: 899,
      description: 'תשלום שנתי של 3,371 ₪ (חיסכון של 25%). חיוב אוטומטי מידי שנה.',
      features: ['גישה לכל התכונות', 'חיסכון של 25%', 'תמיכה מועדפת'],
    },
    vip: {
      name: 'VIP',
      price: 13121,
      displayPrice: 3499,
      description: 'תשלום חד פעמי של 13,121 ₪ לגישה ללא הגבלת זמן וליווי VIP.',
      features: ['גישה לכל החיים', 'תמיכה VIP', 'ייעוץ אישי'],
    }
  };
};

export interface TokenData {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  tokenCreatedAt?: string;
  [key: string]: string | number | boolean | undefined;
}

export const createTokenData = (
  cardNumber: string,
  expiryDate: string,
  cardholderName: string
): TokenData => {
  const [expiryMonth, expiryYear] = expiryDate.split('/');
  
  return {
    lastFourDigits: cardNumber.slice(-4),
    expiryMonth,
    expiryYear,
    cardholderName,
    tokenCreatedAt: new Date().toISOString(),
  };
};
