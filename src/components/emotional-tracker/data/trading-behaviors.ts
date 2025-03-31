
// Define the trading behavior data structure
export interface TradingBehavior {
  id: string;
  label: string;
  description: string;
  category: 'entry' | 'exit' | 'management' | 'analysis';
  psychologicalFactors: string[]; // IDs of related emotions or patterns
  impactOnPerformance: string;
  detectionMethod: string;
}

// Export the trading behaviors array for use throughout the application
export const tradingBehaviors: TradingBehavior[] = [
  {
    id: 'increased_position_size',
    label: 'הגדלת גודל פוזיציה',
    description: 'הגדלת גודל העסקה מעבר לרמה הרגילה או המתוכננת',
    category: 'entry',
    psychologicalFactors: ['overconfidence', 'greed', 'revenge-trading'],
    impactOnPerformance: 'הגדלת סיכון, פוטנציאל להפסדים גדולים יותר, לחץ נפשי מוגבר',
    detectionMethod: 'השוואת גודל עסקה לממוצע היסטורי או לתוכנית המסחר המקורית'
  },
  {
    id: 'decreased_position_size',
    label: 'הקטנת גודל פוזיציה',
    description: 'הקטנת גודל העסקה מתחת לרמה הרגילה או המתוכננת',
    category: 'entry',
    psychologicalFactors: ['fear', 'doubt', 'anxiety'],
    impactOnPerformance: 'הקטנת פוטנציאל רווח, הגנה מפני הפסדים גדולים, תחושת החמצה',
    detectionMethod: 'השוואת גודל עסקה לממוצע היסטורי או לתוכנית המסחר המקורית'
  },
  {
    id: 'early_profit_taking',
    label: 'מימוש רווחים מוקדם',
    description: 'סגירת עסקה רווחית לפני הגעה ליעד המתוכנן',
    category: 'exit',
    psychologicalFactors: ['fear', 'anxiety', 'loss-aversion'],
    impactOnPerformance: 'הקטנת רווח ממוצע, פגיעה ביחס רווח/הפסד, הגדלת מספר עסקאות',
    detectionMethod: 'השוואת נקודת יציאה בפועל ליעד המתוכנן או לממוצע נע'
  },
  {
    id: 'late_exit_losing_trade',
    label: 'יציאה מאוחרת מעסקה מפסידה',
    description: 'החזקת עסקה מפסידה מעבר לנקודת הסטופ המתוכננת',
    category: 'exit',
    psychologicalFactors: ['hope', 'denial', 'sunk-cost-fallacy'],
    impactOnPerformance: 'הגדלת הפסד ממוצע, פגיעה ביחס רווח/הפסד, נזק פסיכולוגי',
    detectionMethod: 'השוואת נקודת יציאה בפועל לסטופ המתוכנן'
  },
  {
    id: 'moving_stops_further',
    label: 'הזזת סטופים רחוק יותר',
    description: 'שינוי נקודת הסטופ להגדלת טווח ההפסד הפוטנציאלי',
    category: 'management',
    psychologicalFactors: ['hope', 'denial', 'sunk-cost-fallacy'],
    impactOnPerformance: 'הגדלת הפסד ממוצע, פגיעה בניהול סיכונים, הגדלת לחץ נפשי',
    detectionMethod: 'השוואת סטופ נוכחי לסטופ המקורי שנקבע בכניסה לעסקה'
  },
  {
    id: 'averaging_down',
    label: 'אוורוג דאון',
    description: 'הוספת לפוזיציה מפסידה במחיר נמוך יותר',
    category: 'management',
    psychologicalFactors: ['hope', 'denial', 'sunk-cost-fallacy'],
    impactOnPerformance: 'הגדלת חשיפה לסיכון, פוטנציאל להפסדים גדולים יותר, הגדלת לחץ נפשי',
    detectionMethod: 'זיהוי הוספה לפוזיציה קיימת כאשר היא בהפסד'
  },
  {
    id: 'excessive_analysis',
    label: 'ניתוח יתר',
    description: 'בחינה חוזרת ונשנית של נתונים ואינדיקטורים ללא קבלת החלטה',
    category: 'analysis',
    psychologicalFactors: ['doubt', 'anxiety', 'analysis-paralysis'],
    impactOnPerformance: 'החמצת הזדמנויות, כניסה מאוחרת, בזבוז זמן ואנרגיה מנטלית',
    detectionMethod: 'מדידת זמן בין זיהוי הזדמנות לביצוע פעולה'
  },
  {
    id: 'ignoring_contrary_evidence',
    label: 'התעלמות מראיות סותרות',
    description: 'התעלמות מאינדיקטורים או נתונים שסותרים את התזה המסחרית',
    category: 'analysis',
    psychologicalFactors: ['overconfidence', 'confirmation-bias'],
    impactOnPerformance: 'כניסה לעסקאות חלשות, החזקת עסקאות מפסידות, הגדלת הפסדים',
    detectionMethod: 'בחינת התייחסות לאינדיקטורים סותרים ביומן המסחר'
  },
  {
    id: 'high_trade_frequency',
    label: 'תדירות מסחר גבוהה',
    description: 'ביצוע מספר עסקאות גבוה מהרגיל בפרק זמן קצר',
    category: 'entry',
    psychologicalFactors: ['impatience', 'boredom', 'overtrading'],
    impactOnPerformance: 'הגדלת עמלות, כניסה לעסקאות חלשות, פיזור תשומת לב',
    detectionMethod: 'השוואת מספר עסקאות יומי/שבועי לממוצע היסטורי'
  },
  {
    id: 'low_quality_setups',
    label: 'סטאפים באיכות נמוכה',
    description: 'כניסה לעסקאות שאינן עומדות בקריטריונים המוגדרים באסטרטגיה',
    category: 'entry',
    psychologicalFactors: ['impatience', 'boredom', 'overtrading'],
    impactOnPerformance: 'הקטנת אחוז הצלחה, הגדלת הפסדים, פגיעה בביטחון',
    detectionMethod: 'השוואת סטאפ לקריטריונים מוגדרים באסטרטגיה'
  },
  {
    id: 'late_entry_after_move',
    label: 'כניסה מאוחרת אחרי תנועה',
    description: 'כניסה לעסקה אחרי שהמחיר כבר נע משמעותית בכיוון הרצוי',
    category: 'entry',
    psychologicalFactors: ['fomo', 'greed', 'impatience'],
    impactOnPerformance: 'כניסה במחיר גרוע, הגדלת סיכון, הקטנת פוטנציאל רווח',
    detectionMethod: 'מדידת תנועת מחיר לפני כניסה ביחס לתנועה הממוצעת'
  },
  {
    id: 'missed_opportunities',
    label: 'החמצת הזדמנויות',
    description: 'אי-כניסה לעסקאות שעומדות בקריטריונים המוגדרים באסטרטגיה',
    category: 'entry',
    psychologicalFactors: ['fear', 'doubt', 'analysis-paralysis'],
    impactOnPerformance: 'הקטנת מספר עסקאות רווחיות, פגיעה בביטחון, תסכול',
    detectionMethod: 'השוואת הזדמנויות שזוהו לעסקאות שבוצעו בפועל'
  },
  {
    id: 'strategy_changes_after_losses',
    label: 'שינויי אסטרטגיה אחרי הפסדים',
    description: 'שינוי תכוף של שיטת המסחר בעקבות הפסדים',
    category: 'analysis',
    psychologicalFactors: ['frustration', 'recency-bias'],
    impactOnPerformance: 'חוסר עקביות, קושי לבחון אסטרטגיה לאורך זמן, בלבול',
    detectionMethod: 'מעקב אחר שינויי אסטרטגיה ביחס לתוצאות אחרונות'
  },
  {
    id: 'ignoring_long_term_data',
    label: 'התעלמות מנתונים ארוכי טווח',
    description: 'התבססות על נתונים קצרי טווח והתעלמות ממגמות ארוכות טווח',
    category: 'analysis',
    psychologicalFactors: ['recency-bias'],
    impactOnPerformance: 'החלטות מוטות, התעלמות מדפוסים חוזרים, חוסר פרספקטיבה',
    detectionMethod: 'בחינת טווח הזמן של הנתונים המשמשים לניתוח'
  },
  {
    id: 'position_sizing_based_on_streak',
    label: 'גודל פוזיציה מבוסס רצף',
    description: 'שינוי גודל עסקה בהתבסס על רצף הצלחות או כישלונות',
    category: 'entry',
    psychologicalFactors: ['gambler-fallacy', 'overconfidence'],
    impactOnPerformance: 'ניהול סיכונים לא עקבי, הגדלת תנודתיות בתיק, הפסדים גדולים',
    detectionMethod: 'השוואת גודל עסקה לתוצאות עסקאות קודמות'
  },
  {
    id: 'ignoring_analysis_for_gut',
    label: 'התעלמות מניתוח לטובת תחושות בטן',
    description: 'קבלת החלטות על בסיס תחושות במקום על בסיס ניתוח מובנה',
    category: 'analysis',
    psychologicalFactors: ['overconfidence', 'gambler-fallacy'],
    impactOnPerformance: 'חוסר עקביות, קושי לשחזר הצלחות, קושי ללמוד מטעויות',
    detectionMethod: 'השוואת הנמקות לעסקאות לקריטריונים מוגדרים באסטרטגיה'
  },
  {
    id: 'unrealistic_expectations',
    label: 'ציפיות לא ריאליסטיות',
    description: 'ציפייה לתוצאות טובות יותר ממה שסביר בהתבסס על נתונים היסטוריים',
    category: 'analysis',
    psychologicalFactors: ['perfectionism', 'overconfidence'],
    impactOnPerformance: 'אכזבה מתמדת, לחץ נפשי, החלטות מסוכנות להשגת יעדים',
    detectionMethod: 'השוואת ציפיות מוצהרות לביצועים היסטוריים בשוק'
  }
];

// Export behavior categories for filtering and analysis
export const behaviorCategories = {
  entry: tradingBehaviors.filter(b => b.category === 'entry').map(b => b.id),
  exit: tradingBehaviors.filter(b => b.category === 'exit').map(b => b.id),
  management: tradingBehaviors.filter(b => b.category === 'management').map(b => b.id),
  analysis: tradingBehaviors.filter(b => b.category === 'analysis').map(b => b.id),
  negative: tradingBehaviors.filter(b => 
    b.psychologicalFactors.some(f => 
      ['revenge-trading', 'fomo-trading', 'overtrading', 'sunk-cost-fallacy'].includes(f)
    )
  ).map(b => b.id)
};

// Function to analyze trading behaviors and provide recommendations
export const analyzeTradingBehaviors = (
  observedBehaviors: string[], // Array of behavior IDs observed in recent trading
  emotionalState: string[], // Array of current emotion IDs
  tradeResults: { wins: number; losses: number } // Recent trade performance
): {
  primaryConcerns: string[];
  recommendations: string[];
  suggestedFocus: string;
} => {
  const primaryConcerns: string[] = [];
  const recommendations: string[] = [];
  let suggestedFocus = '';
  
  // Identify primary concerns based on observed behaviors
  if (observedBehaviors.includes('increased_position_size') && 
      (emotionalState.includes('overconfidence') || tradeResults.wins > tradeResults.losses * 2)) {
    primaryConcerns.push('סיכון מוגבר בשל ביטחון יתר');
    recommendations.push('חזור לגודל עסקה סטנדרטי המוגדר בתוכנית המסחר שלך');
    recommendations.push('הגדר מראש את גודל העסקה לפני תחילת יום המסחר');
  }
  
  if (observedBehaviors.includes('late_exit_losing_trade') || 
      observedBehaviors.includes('moving_stops_further')) {
    primaryConcerns.push('קושי לקבל הפסדים');
    recommendations.push('הגדר סטופים מראש והשתמש בהוראות אוטומטיות');
    recommendations.push('תרגל קבלת הפסדים קטנים באופן מודע');
    suggestedFocus = suggestedFocus || 'ניהול הפסדים';
  }
  
  if (observedBehaviors.includes('early_profit_taking') && 
      emotionalState.includes('fear')) {
    primaryConcerns.push('פחד מאיבוד רווחים');
    recommendations.push('השתמש באסטרטגיית יציאה חלקית: סגור חלק מהפוזיציה ביעד הראשון');
    recommendations.push('הגדר יעדי רווח מראש והשתמש בהוראות אוטומטיות');
  }
  
  if (observedBehaviors.includes('high_trade_frequency') && 
      observedBehaviors.includes('low_quality_setups')) {
    primaryConcerns.push('מסחר יתר');
    recommendations.push('הגדר מספר מקסימלי של עסקאות ליום');
    recommendations.push('דרוש מעצמך לתעד הצדקה לכל עסקה לפני ביצועה');
    suggestedFocus = suggestedFocus || 'איכות מול כמות';
  }
  
  if (observedBehaviors.includes('excessive_analysis') && 
      observedBehaviors.includes('missed_opportunities')) {
    primaryConcerns.push('שיתוק אנליטי');
    recommendations.push('הגדר מסגרת זמן להחלטה ומספר מוגבל של אינדיקטורים לבדיקה');
    recommendations.push('פתח רשימת בדיקה פשוטה לכניסה לעסקה');
    suggestedFocus = suggestedFocus || 'קבלת החלטות';
  }
  
  if (observedBehaviors.includes('late_entry_after_move') && 
      emotionalState.includes('impatience')) {
    primaryConcerns.push('FOMO - פחד מהחמצה');
    recommendations.push('הגדר מראש נקודות כניסה ואל תסטה מהן');
    recommendations.push('הזכר לעצמך שתמיד יהיו הזדמנויות נוספות');
  }
  
  if (observedBehaviors.includes('strategy_changes_after_losses')) {
    primaryConcerns.push('חוסר עקביות באסטרטגיה');
    recommendations.push('התחייב לאסטרטגיה אחת למשך תקופת זמן מוגדרת (לפחות 20 עסקאות)');
    recommendations.push('הערך אסטרטגיה על בסיס נתונים סטטיסטיים ולא על בסיס תחושות');
    suggestedFocus = suggestedFocus || 'עקביות';
  }
  
  // Default recommendations if no specific concerns identified
  if (primaryConcerns.length === 0) {
    if (tradeResults.losses > tradeResults.wins) {
      primaryConcerns.push('תקופה מאתגרת במסחר');
      recommendations.push('הקטן זמנית את גודל העסקאות עד לחזרה לעקביות');
      recommendations.push('התמקד בעסקאות עם יחס סיכון/סיכוי גבוה במיוחד');
      suggestedFocus = 'התאוששות';
    } else {
      primaryConcerns.push('שמירה על ביצועים עקביים');
      recommendations.push('המשך לתעד ולנתח את העסקאות המוצלחות שלך');
      recommendations.push('זהה את הדפוסים החוזרים בעסקאות המוצלחות ביותר');
      suggestedFocus = 'שיפור מתמיד';
    }
  }
  
  // If no focus was suggested based on concerns, provide a default
  if (!suggestedFocus) {
    suggestedFocus = primaryConcerns.length > 1 ? 'מודעות עצמית' : 'יישום עקבי';
  }
  
  return {
    primaryConcerns,
    recommendations,
    suggestedFocus
  };
};
