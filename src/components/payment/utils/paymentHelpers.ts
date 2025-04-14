
// Get subscription plan details
export const getSubscriptionPlans = () => {
  return [
    {
      id: 'monthly',
      name: 'מנוי חודשי',
      description: 'חודש ראשון בחינם, לאחר מכן 371₪ לחודש',
      price: 371,
      features: [
        'גישה מלאה לכל התוכן',
        'עדכונים מיידיים',
        'תמיכה בדוא"ל'
      ],
      isFeatured: false,
      freeTrialDays: 30,
      isRecurring: true,
      billingCycle: 'monthly'
    },
    {
      id: 'annual',
      name: 'מנוי שנתי',
      description: '3,371₪ לשנה (חיסכון של 1,081₪)',
      price: 3371,
      features: [
        'גישה מלאה לכל התוכן',
        'עדכונים מיידיים',
        'תמיכה בדוא"ל ובטלפון',
        'תוכן בלעדי'
      ],
      isFeatured: true,
      freeTrialDays: 0,
      isRecurring: true,
      billingCycle: 'yearly'
    },
    {
      id: 'vip',
      name: 'מנוי VIP לכל החיים',
      description: 'תשלום חד פעמי של 13,121₪',
      price: 13121,
      features: [
        'גישה לכל החיים לכל התוכן',
        'עדכונים לכל החיים',
        'תמיכה VIP',
        'כל התוכן הבלעדי',
        'גישה מוקדמת לתוכן חדש'
      ],
      isFeatured: false,
      freeTrialDays: 0,
      isRecurring: false,
      billingCycle: 'once'
    }
  ];
};

// Check if a subscription is active
export const isSubscriptionActive = (
  status: string, 
  expiresAt: string | null, 
  trialEndsAt: string | null
): boolean => {
  if (status !== 'active' && status !== 'trial') {
    return false;
  }
  
  const now = new Date();
  
  if (status === 'trial' && trialEndsAt) {
    const trialEnd = new Date(trialEndsAt);
    if (trialEnd < now) {
      return false;
    }
  }
  
  if (expiresAt) {
    const expiration = new Date(expiresAt);
    if (expiration < now) {
      return false;
    }
  }
  
  return true;
};

// Format a price in the Israeli format
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Get plan details by ID
export const getPlanById = (planId: string) => {
  const plans = getSubscriptionPlans();
  return plans.find(plan => plan.id === planId);
};
