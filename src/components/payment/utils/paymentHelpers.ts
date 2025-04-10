
import { SubscriptionPlan } from '@/types/payment';

export const getSubscriptionPlans = (): Record<string, SubscriptionPlan> => {
  return {
    monthly: {
      id: 'monthly',
      name: 'מנוי חודשי',
      price: 99,
      description: 'גישה לכל התכונות עם חידוש אוטומטי',
      features: [
        'גישה לכל הכלים',
        'הורדת דוחות',
        'תמיכה בדוא"ל',
        'עדכונים חודשיים'
      ],
      trialDays: 14,
      billingCycle: 'monthly',
      currency: 'USD'
    },
    annual: {
      id: 'annual',
      name: 'מנוי שנתי',
      price: 899, // ~25% discount compared to monthly * 12
      description: 'חסכון של 25% לעומת מנוי חודשי',
      features: [
        'כל היתרונות של המנוי החודשי',
        'חסכון משמעותי',
        'תמיכה מועדפת',
        'הדרכות מיוחדות'
      ],
      trialDays: 14,
      billingCycle: 'annual',
      currency: 'USD'
    },
    vip: {
      id: 'vip',
      name: 'מנוי VIP',
      price: 3499,
      description: 'הגרסה המושלמת לעסקים ומקצוענים',
      features: [
        'כל היתרונות של המנוי השנתי',
        'ליווי אישי',
        'התאמות מיוחדות',
        'תמיכת פרימיום 24/7',
        'מספר משתמשים לא מוגבל'
      ],
      trialDays: 7,
      billingCycle: 'annual',
      currency: 'USD'
    }
  };
};

export const getPlanSummary = (plan: SubscriptionPlan | undefined) => {
  if (!plan) return null;
  
  const isFreeTrialPlan = plan.trialDays > 0;
  const isMonthly = plan.billingCycle === 'monthly';
  const currency = plan.currency || 'USD';
  
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(price);
  };
  
  const summary = {
    title: plan.name,
    description: plan.description,
    pricingLabel: isMonthly ? 'מחיר חודשי:' : 'מחיר שנתי:',
    price: formatPrice(plan.price),
    trialNote: isFreeTrialPlan 
      ? `תקופת ניסיון חינם למשך ${plan.trialDays} ימים, לאחר מכן חיוב ${isMonthly ? 'חודשי' : 'שנתי'} של ${formatPrice(plan.price)}.`
      : ''
  };
  
  return { summary, isFreeTrialPlan };
};

/**
 * Create tokenization data object from payment form
 */
export const createTokenData = (cardNumber: string, expiryDate: string, cardholderName: string) => {
  // Parse expiry date in MM/YY format
  const [expiryMonth, expiryYear] = expiryDate.split('/');
  
  // Create token data object with card details
  return {
    token: `simulated_token_${Date.now()}`, // This would normally come from the payment processor
    lastFourDigits: cardNumber.replace(/\s/g, '').slice(-4),
    expiryMonth,
    expiryYear,
    cardholderName
  };
};
