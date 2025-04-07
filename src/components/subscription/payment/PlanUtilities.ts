
export const getPlanDetails = (planId: string) => {
  if (planId === 'annual') {
    return {
      name: 'שנתי',
      price: '$899',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      info: 'חיוב מיידי לכל השנה'
    };
  } else if (planId === 'vip') {
    return {
      name: 'VIP',
      price: '$3499',
      description: 'גישה לכל החיים בתשלום חד פעמי',
      info: 'חיוב מיידי חד פעמי'
    };
  } else {
    // Default to monthly plan
    return {
      name: 'חודשי',
      price: '$99',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      info: 'החיוב הראשון לאחר 30 יום'
    };
  }
};
