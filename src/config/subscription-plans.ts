
import { SubscriptionPlan } from '@/components/payment/utils/paymentHelpers';

export const subscriptionPlans = {
  monthly: {
    id: 'monthly',
    name: 'Standard',
    price: 371,
    displayPrice: '371₪',
    description: 'מנוי חודשי עם 30 ימי ניסיון בחינם',
    hasTrial: true,
    freeTrialDays: 30
  },
  annual: {
    id: 'annual',
    name: 'Pro Annual',
    price: 3371,
    displayPrice: '3,371₪',
    description: 'מנוי שנתי עם 30 ימי ניסיון בחינם',
    hasTrial: true,
    freeTrialDays: 30
  },
  vip: {
    id: 'vip',
    name: 'VIP',
    price: 13121,
    displayPrice: '13,121₪',
    description: 'מנוי VIP עם גישה מלאה לכל התכונות',
    hasTrial: false
  }
};

export const getSubscriptionPlans = (): typeof subscriptionPlans => {
  return subscriptionPlans;
};
