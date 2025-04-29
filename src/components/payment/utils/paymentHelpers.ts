
import { PlanDetails } from '@/types/payment';

export interface SubscriptionPlan extends PlanDetails {
  id: string;
  name: string;
  displayName?: string;
  description: string;
  price: number;
  displayPrice: string;
  billingFrequency: 'monthly' | 'yearly' | 'one-time';
  featured?: boolean;
  hasTrial?: boolean;
  freeTrialDays?: number;
  features?: string[];
}

export const getSubscriptionPlans = (): { 
  monthly: SubscriptionPlan; 
  annual: SubscriptionPlan; 
  vip: SubscriptionPlan;
} => {
  return {
    monthly: {
      id: 'monthly',
      name: 'חבילה חודשית',
      description: 'חבילה בסיסית עם תשלום חודשי',
      price: 29.90,
      displayPrice: '₪29.90',
      billingFrequency: 'monthly',
      hasTrial: true,
      freeTrialDays: 7,
      features: [
        'גישה לכל התכנים הבסיסיים',
        'תמיכה במייל',
        'עד 5 משתמשים'
      ]
    },
    annual: {
      id: 'annual',
      name: 'חבילה שנתית',
      description: 'חבילה משתלמת עם תשלום שנתי',
      price: 290.00,
      displayPrice: '₪290',
      billingFrequency: 'yearly',
      featured: true,
      features: [
        'גישה לכל התכנים הבסיסיים',
        'תמיכה טלפונית ובמייל',
        'עד 20 משתמשים',
        'כלים מתקדמים ודוחות'
      ]
    },
    vip: {
      id: 'vip',
      name: 'VIP לכל החיים',
      description: 'גישה קבועה לכל התכנים - תשלום חד פעמי',
      price: 990.00,
      displayPrice: '₪990',
      billingFrequency: 'one-time',
      features: [
        'גישה לכל לכל החיים',
        'תמיכה VIP',
        'משתמשים ללא הגבלה',
        'גישה לתכנים עתידיים'
      ]
    }
  };
};
