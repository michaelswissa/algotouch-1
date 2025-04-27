
import { SubscriptionPlan } from '@/components/payment/types/payment';

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  features: string[];
  monthlyPrice: number;
  annualPrice: number;
  displayMonthlyPrice: string;
  displayAnnualPrice: string;
  hasTrial: boolean;
  freeTrialDays: number;
  isPopular?: boolean;
}

// Core plans configuration
export const SUBSCRIPTION_PLANS: Record<string, PlanConfig> = {
  monthly: {
    id: 'monthly',
    name: 'מסלול חודשי',
    description: 'חודש ניסיון חינם, אחר כך חיוב אוטומטי של 371 ₪ לחודש. ללא התחייבות.',
    features: [
      'חודש ראשון חינם',
      'מדריך הפעלה ברור ומדוייק',
      'עוזר אישי AI זמין 24/7',
      'בלוג מקצועי',
      'קהילה סגורה',
      'מערכת ניתוח ביצועים',
      'יומן מסחר דיגיטלי + תובנות AI',
      'קורסים משלימים במתנה',
      'הטבה של 300$ בעמלות',
    ],
    monthlyPrice: 371,
    annualPrice: 4452, // 371 * 12
    displayMonthlyPrice: '371 ₪',
    displayAnnualPrice: '4,452 ₪',
    hasTrial: true,
    freeTrialDays: 30,
    isPopular: false,
  },
  annual: {
    id: 'annual',
    name: 'מסלול שנתי',
    description: 'תשלום שנתי של 3,371 ₪ (חיסכון של 25%). חיוב אוטומטי מידי שנה.',
    features: [
      'כל הפיצ\'רים מהמסלול החודשי',
      'חיסכון של 25% לעומת המסלול החודשי',
      'גישה מוקדמת (Beta) לפיצ\'רים חדשים',
      'תמיכה מועדפת בווטסאפ',
      'רצף עבודה שנתי',
    ],
    monthlyPrice: 281, // 3371 / 12
    annualPrice: 3371,
    displayMonthlyPrice: '281 ₪',
    displayAnnualPrice: '3,371 ₪',
    hasTrial: false,
    freeTrialDays: 0,
    isPopular: true,
  },
  vip: {
    id: 'vip',
    name: 'מסלול VIP',
    description: 'תשלום חד פעמי של 13,121 ₪ לגישה ללא הגבלת זמן וליווי VIP.',
    features: [
      'כל הפיצ\'רים מהמסלול השנתי',
      'גישה בלתי מוגבלת',
      'ליווי אישי בזום',
      'הכוונה מקצועית לפיתוח קריירה בשוק ההון',
      'אירועי VIP וקבוצות Mastermind',
    ],
    monthlyPrice: 13121,
    annualPrice: 13121,
    displayMonthlyPrice: '13,121 ₪',
    displayAnnualPrice: '13,121 ₪',
    hasTrial: false,
    freeTrialDays: 0,
    isPopular: false,
  },
};

// Helper function to get plan by ID
export function getPlanById(planId: string): PlanConfig | undefined {
  return SUBSCRIPTION_PLANS[planId];
}

// Helper function to format plan price for display
export function formatPlanPrice(price: number, currency: string = '₪'): string {
  return `${price.toLocaleString('he-IL')} ${currency}`;
}

// Convert plan config to subscription plan type
export function convertToSubscriptionPlan(plan: PlanConfig): SubscriptionPlan {
  return {
    id: plan.id,
    name: plan.name,
    price: plan.id === 'annual' ? plan.annualPrice : plan.monthlyPrice,
    displayPrice: plan.id === 'annual' ? plan.displayAnnualPrice : plan.displayMonthlyPrice,
    description: plan.description,
    hasTrial: plan.hasTrial,
    freeTrialDays: plan.freeTrialDays,
    isPopular: plan.isPopular,
    features: plan.features,
  };
}
