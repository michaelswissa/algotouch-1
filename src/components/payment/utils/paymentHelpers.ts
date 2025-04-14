
/**
 * Get price information for subscription plans
 */
export const getSubscriptionPlans = () => {
  return {
    monthly: {
      name: 'מנוי חודשי',
      price: 99,
      freeTrialDays: 14,
      hasTrial: true
    },
    annual: {
      name: 'מנוי שנתי',
      price: 999,
      freeTrialDays: 0,
      hasTrial: false
    },
    vip: {
      name: 'מנוי פרימיום',
      price: 1999,
      freeTrialDays: 0,
      hasTrial: false
    }
  };
};

/**
 * Format currency
 */
export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('he-IL', {
    style: 'currency',
    currency: 'ILS',
    minimumFractionDigits: 0
  }).format(amount);
};

/**
 * Check if a payment session is still valid
 */
export const isPaymentSessionValid = () => {
  const sessionCreated = localStorage.getItem('payment_session_created');
  if (!sessionCreated) return false;
  
  const created = new Date(sessionCreated);
  const now = new Date();
  
  // Session is valid for 30 minutes
  return (now.getTime() - created.getTime()) < 30 * 60 * 1000;
};

/**
 * Get pending payment details
 */
export const getPendingPaymentDetails = () => {
  const id = localStorage.getItem('payment_pending_id');
  const plan = localStorage.getItem('payment_pending_plan');
  const created = localStorage.getItem('payment_session_created');
  
  if (!id || !plan || !created) return null;
  
  return {
    lowProfileId: id,
    planId: plan,
    created: new Date(created)
  };
};

/**
 * Clear payment session data
 */
export const clearPaymentSession = () => {
  localStorage.removeItem('payment_pending_id');
  localStorage.removeItem('payment_pending_plan');
  localStorage.removeItem('payment_session_created');
};
