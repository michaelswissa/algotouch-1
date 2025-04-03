
import { PlanFeatureProps } from './PlanFeature';
import React from 'react';

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  description: string;
  icon: React.ReactNode;
  features: PlanFeatureProps[];
  hasTrial?: boolean;
  recommended?: boolean;
}

export const getPlansData = (): Plan[] => {
  return [
    {
      id: 'monthly',
      name: 'מסלול חודשי',
      price: 99,
      currency: '$',
      billingPeriod: 'לחודש',
      description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
      icon: null, // Will be set in the PlanCard component
      features: [
        { name: 'חודש ראשון חינם', icon: '🎁', description: 'קודם תראה שהכל עובד, אחר כך תשלם.', included: true },
        { name: 'מדריך הפעלה ברור ומדוייק', icon: '💡', description: 'בלי למידה מורכבת, כל מה שצריך לדעת כדי להתחיל לעבוד.', included: true },
        { name: 'עוזר אישי AI זמין 24/7', icon: '🤖', description: 'תקבל הכוונה מדויקת, תובנות חכמות ותמיכה מיידית בכל מה שקשור למסחר ושוק ההון.', included: true },
        { name: 'בלוג מקצועי', icon: '🧠', description: 'מאמרים, סקירות עומק ועדכונים בזמן אמת שיעזרו לך לקבל החלטות טובות יותר.', included: true },
        { name: 'קהילה סגורה', icon: '👥', description: 'מקום לשאול, ללמוד ולהישאר מעודכן עם סוחרים שחיים את השוק כמוך.', included: true },
        { name: 'מערכת ניתוח ביצועים', icon: '📈', description: 'זיהוי נקודות חולשה, חוזקות והזדמנויות לשיפור המסחר שלך.', included: true },
        { name: 'יומן מסחר דיגיטלי + תובנות AI', icon: '📓', description: 'מעקב אחרי ביצועים ותובנות סטטיסטיות.', included: true },
        { name: 'קורסים משלימים במתנה', icon: '🎓', description: 'היכרות עם חוזים עתידיים + שליטה מלאה במערכת TradeStation.', included: true },
        { name: 'הטבה של 300$ בעמלות', icon: '💵', description: 'למצטרפים חדשים בלבד.', included: true },
      ],
      hasTrial: true,
    },
    {
      id: 'annual',
      name: 'מסלול שנתי',
      price: 899,
      currency: '$',
      billingPeriod: 'לשנה',
      description: 'למי שמבין את הערך שאנחנו מביאים – זו החבילה המשתלמת ביותר.',
      icon: null, // Will be set in the PlanCard component
      features: [
        { name: 'כל הפיצ\'רים מהמסלול החודשי', icon: '🧰', description: 'בלי יוצא מן הכלל.', included: true },
        { name: 'גישה מוקדמת (Beta) לפיצ\'רים חדשים', icon: '🧪', description: 'בדוק ראשון את הפיצ\'רים החדשים, לפני כולם.', included: true },
        { name: 'תמיכה מועדפת בווטסאפ', icon: '⚡', description: 'עונים לך מהר יותר, ברור יותר, אישי יותר.', included: true },
        { name: 'חיסכון משמעותי', icon: '💸', description: 'חוסך כ-300$ בשנה.', included: true },
        { name: 'רצף עבודה שנתי', icon: '🔁', description: 'בלי הפרעות, בלי התנתקויות, בלי לאבד מומנטום.', included: true },
      ],
      hasTrial: false,
    },
    {
      id: 'vip',
      name: 'מסלול VIP',
      price: 3499,
      currency: '$',
      billingPeriod: 'לכל החיים',
      description: 'מיועד לסוחרים שמכוונים גבוה במיוחד ומחפשים יתרון משמעותי בשוק.',
      icon: null, // Will be set in the PlanCard component
      features: [
        { name: 'כל הפיצ\'רים מהמסלול השנתי', icon: '🌟', description: 'כולל תמיכה מועדפת וגישה מוקדמת לפיצ\'רים החדשים.', included: true },
        { name: 'גישה בלתי מוגבלת', icon: '♾️', description: 'כל מה שהמערכת מציעה, פתוח עבורך תמיד.', included: true },
        { name: 'ליווי אישי בזום', icon: '🎯', description: 'שיחות עם מומחים שצוללים איתך לעומק, מנתחים את התיק שלך ועוזרים לך לחדד מהלכים ולמקסם תוצאות.', included: true },
        { name: 'הכוונה מקצועית לפיתוח קריירה בשוק ההון', icon: '📊', description: 'כולל בניית מסלול אישי, מיפוי מטרות, חיבורים נכונים וצמיחה מתמשכת בתעשייה.', included: true },
        { name: 'אירועי VIP וקבוצות Mastermind', icon: '🔑', description: 'נטוורקינג איכותי, שיתופי פעולה ולמידה ממיטב הסוחרים בתחום.', included: true },
      ],
      hasTrial: false,
    }
  ];
};
