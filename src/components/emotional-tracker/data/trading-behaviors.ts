
export interface TradingBehavior {
  id: string;
  name: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  relatedPatterns?: string[];
  recommendations?: string[];
}

export const tradingBehaviors: TradingBehavior[] = [
  {
    id: 'overtrading',
    name: 'מסחר יתר',
    description: 'ביצוע יותר מדי עסקאות בפרק זמן קצר',
    impact: 'negative',
    relatedPatterns: ['fomo', 'revenge_trading', 'overconfidence'],
    recommendations: [
      'הגבל את מספר העסקאות היומי',
      'המתן לסט-אפים ברורים לפי האסטרטגיה שלך',
      'תעד את הסיבה לכל עסקה לפני ביצועה'
    ]
  },
  {
    id: 'position_sizing',
    name: 'גודל פוזיציה לא עקבי',
    description: 'שינוי גודל העסקאות בהתאם לרגשות או לתוצאות אחרונות',
    impact: 'negative',
    relatedPatterns: ['revenge_trading', 'loss_aversion', 'overconfidence'],
    recommendations: [
      'הגדר מראש את גודל העסקה כאחוז קבוע מההון',
      'הכן תוכנית מסחר מפורטת ועקוב אחריה',
      'אל תשנה את גודל העסקה במהלך יום המסחר'
    ]
  },
  {
    id: 'early_exit',
    name: 'יציאה מוקדמת',
    description: 'סגירת עסקאות רווחיות מוקדם מדי מפחד',
    impact: 'negative',
    relatedPatterns: ['loss_aversion', 'fomo'],
    recommendations: [
      'הגדר יעדי רווח מראש ואל תסטה מהם',
      'השתמש בטכניקת הזזת סטופ לנעילת רווחים',
      'בחן את העסקאות שיצאת מהן מוקדם וחשב את הרווח האלטרנטיבי'
    ]
  },
  {
    id: 'plan_following',
    name: 'עקביות בתוכנית',
    description: 'ביצוע עסקאות בהתאם לתוכנית מסחר מוגדרת מראש',
    impact: 'positive',
    recommendations: [
      'הכן תוכנית מסחר יומית לפני תחילת המסחר',
      'בדוק בסוף היום את העקביות בביצוע התוכנית',
      'תגמל את עצמך על עקביות, לא רק על רווחים'
    ]
  },
  {
    id: 'journaling',
    name: 'ניהול יומן מסחר',
    description: 'תיעוד שיטתי של עסקאות, מחשבות ורגשות',
    impact: 'positive',
    recommendations: [
      'הקדש 15 דקות בסוף כל יום לתיעוד',
      'כלול היבטים רגשיים והתנהגותיים ביומן',
      'סקור את היומן מדי שבוע לזיהוי דפוסים'
    ]
  }
];
