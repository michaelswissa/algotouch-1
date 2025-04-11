export interface SubscriptionPlan {
  name: string;
  price: number;
  description: string;
  currency?: string;
}

export const getSubscriptionPlans = () => ({
  monthly: {
    name: 'חודשי',
    price: 371, // Actual price in ILS
    displayPrice: 99, // Display price in USD
    description: 'חודש ניסיון חינם, אחר כך חיוב אוטומטי של 371 ₪ לחודש.',
    features: ['גישה לכל התכונות', 'ביטול בכל עת', 'עדכונים שוטפים'],
    hasTrial: true,
  },
  annual: {
    name: 'שנתי',
    price: 3371, // Actual price in ILS
    displayPrice: 899, // Display price in USD
    description: 'תשלום שנתי של 3,371 ₪ (חיסכון של 25%). חיוב אוטומטי מידי שנה.',
    features: ['גישה לכל התכונות', 'חיסכון של 25%', 'תמיכה מועדפת'],
  },
  vip: {
    name: 'VIP',
    price: 13121, // Actual price in ILS
    displayPrice: 3499, // Display price in USD
    description: 'תשלום חד פעמי של 13,121 ₪ לגישה ללא הגבלת זמן וליווי VIP.',
    features: ['גישה לכל החיים', 'תמיכה VIP', 'ייעוץ אישי'],
  },
});

export interface TokenData {
  lastFourDigits: string;
  expiryMonth: string;
  expiryYear: string;
  cardholderName: string;
  [key: string]: string | number | boolean;
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
