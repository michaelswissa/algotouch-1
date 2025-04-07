
export const getPlanDetails = (selectedPlan: string) => {
  if (selectedPlan === 'monthly') {
    return {
      name: 'מנוי חודשי',
      price: '$99',
      description: 'כולל חודש ניסיון חינם',
      info: 'החיוב הראשון יתבצע רק לאחר 30 יום'
    };
  } else if (selectedPlan === 'annual') {
    return {
      name: 'מנוי שנתי',
      price: '$899',
      description: 'חסכון של 25% לעומת מנוי חודשי',
      info: 'חיוב חד פעמי עבור שנה שלמה'
    };
  } else {
    return {
      name: 'מנוי VIP',
      price: '$3,499',
      description: 'תשלום חד פעמי לכל החיים',
      info: 'גישה מלאה לכל החיים ללא חיובים נוספים'
    };
  };
};
