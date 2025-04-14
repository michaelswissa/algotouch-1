
// Subscription plan definitions
export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  displayPrice: string;
  description: string;
  hasTrial: boolean;
  freeTrialDays: number;
  isPopular?: boolean;
  features: string[];
}

export interface SubscriptionPlans {
  monthly: SubscriptionPlan;
  annual: SubscriptionPlan;
  vip: SubscriptionPlan;
}

export const getSubscriptionPlans = (): SubscriptionPlans => {
  return {
    monthly: {
      id: 'monthly',
      name: 'מנוי חודשי',
      price: 49.90,
      displayPrice: '₪49.90',
      description: 'חיוב חודשי, ניתן לבטל בכל עת',
      hasTrial: true,
      freeTrialDays: 7,
      features: [
        'גישה לכל התכנים',
        'תמיכה טכנית בסיסית',
        'ניתן לבטל בכל עת'
      ]
    },
    annual: {
      id: 'annual',
      name: 'מנוי שנתי',
      price: 499.00,
      displayPrice: '₪499',
      description: 'חיסכון של 15% בהשוואה לתשלום חודשי',
      hasTrial: true,
      freeTrialDays: 14,
      isPopular: true,
      features: [
        'גישה לכל התכנים',
        'חיסכון של 15% בהשוואה לתשלום חודשי',
        'תמיכה טכנית מורחבת',
        'ניתן לבטל בכל עת עם החזר יחסי'
      ]
    },
    vip: {
      id: 'vip',
      name: 'מנוי לכל החיים',
      price: 1999.00,
      displayPrice: '₪1,999',
      description: 'תשלום חד פעמי, גישה לכל החיים',
      hasTrial: false,
      freeTrialDays: 0,
      features: [
        'גישה לכל החיים לכל התכנים',
        'כולל תכנים עתידיים',
        'תמיכה טכנית VIP',
        'הטבות ייחודיות למנויי VIP'
      ]
    }
  };
};

// Format price amount to display with proper currency symbol
export const formatPrice = (amount: number, currencyCode = 'ILS'): string => {
  const formatter = new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'ILS' ? 0 : 2,
    maximumFractionDigits: 2,
  });
  
  return formatter.format(amount);
};

// Payment status types
export enum PaymentStatus {
  IDLE = 'idle',
  INITIALIZING = 'initializing',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
}
