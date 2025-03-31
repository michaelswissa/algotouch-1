
export interface EnhancedEmotion {
  id: string;
  label: string;
  category: 'positive' | 'negative' | 'neutral';
  description: string;
  impactLevel: number; // Scale from -10 to 10
  recommendations?: string[];
  color: string;
}

export const enhancedEmotions: EnhancedEmotion[] = [
  {
    id: 'confidence',
    label: 'ביטחון',
    category: 'positive',
    description: 'תחושת ודאות ואמונה ביכולת העצמית לקבל החלטות מסחר טובות',
    impactLevel: 8,
    recommendations: [
      'הגדר מראש את תנאי הכניסה והיציאה לעסקאות',
      'תעד את המחשבות והסיבות להחלטות כאשר אתה מרגיש ביטחון'
    ],
    color: 'bg-emerald-600'
  },
  {
    id: 'fear',
    label: 'פחד',
    category: 'negative',
    description: 'חשש מפני הפסד או מהחמצת הזדמנות שמשפיע על החלטות',
    impactLevel: -7,
    recommendations: [
      'תרגל נשימות עמוקות לפני קבלת החלטות',
      'הצב הגבלות ברורות לגודל העסקאות כדי להפחית חרדה'
    ],
    color: 'bg-red-600'
  },
  {
    id: 'frustration',
    label: 'תסכול',
    category: 'negative',
    description: 'תחושת אכזבה או כעס על תוצאות מסחר או החלטות',
    impactLevel: -8,
    recommendations: [
      'קח הפסקה קצרה אחרי הפסד לפני עסקה חדשה',
      'נהל יומן תסכולים לזהות דפוסים חוזרים'
    ],
    color: 'bg-orange-600'
  },
  {
    id: 'satisfaction',
    label: 'סיפוק',
    category: 'positive',
    description: 'תחושת הנאה ומילוי מעסקאות מוצלחות או מהתהליך',
    impactLevel: 7,
    recommendations: [
      'תעד את העסקאות המספקות כדי לחזור אליהן בעתיד',
      'השתמש בתחושת הסיפוק כמדד לאיכות העסקאות'
    ],
    color: 'bg-cyan-600'
  },
  {
    id: 'anxiety',
    label: 'חרדה',
    category: 'negative',
    description: 'תחושת דאגה ואי-שקט לגבי תוצאות או החלטות עתידיות',
    impactLevel: -9,
    recommendations: [
      'הגדר מראש את הסיכון המקסימלי לכל עסקה',
      'תרגל טכניקות להרגעה עצמית'
    ],
    color: 'bg-purple-600'
  },
  {
    id: 'calm',
    label: 'רוגע',
    category: 'positive',
    description: 'מצב של שלווה ושיקול דעת מאוזן',
    impactLevel: 9,
    recommendations: [
      'תרגל מדיטציה לפני תחילת יום המסחר',
      'שמור על סביבת מסחר שקטה ונטולת הסחות דעת'
    ],
    color: 'bg-blue-600'
  },
  {
    id: 'impulsive',
    label: 'אימפולסיביות',
    category: 'negative',
    description: 'נטייה לפעול במהירות ללא שיקול דעת מספק',
    impactLevel: -9,
    recommendations: [
      'המתן 5 דקות לפני ביצוע כל עסקה',
      'תעד את ההצדקה לכל עסקה לפני ביצועה'
    ],
    color: 'bg-amber-600'
  },
  {
    id: 'doubt',
    label: 'ספק',
    category: 'negative',
    description: 'חוסר ביטחון בהחלטות או באסטרטגיה',
    impactLevel: -6,
    recommendations: [
      'חזור על אסטרטגיית המסחר שלך לפני כל החלטה',
      'תעד הצלחות קודמות כדי לחזק את הביטחון'
    ],
    color: 'bg-gray-600'
  },
  {
    id: 'greed',
    label: 'חמדנות',
    category: 'negative',
    description: 'רצון עז לרווחים גדולים שמשפיע על ניהול סיכונים',
    impactLevel: -8,
    recommendations: [
      'הגדר יעדי רווח ריאליסטיים מראש',
      'הקפד על גודל עסקאות עקבי'
    ],
    color: 'bg-yellow-600'
  },
  {
    id: 'patience',
    label: 'סבלנות',
    category: 'positive',
    description: 'יכולת להמתין להזדמנויות ולא לפעול מתוך דחף',
    impactLevel: 8,
    recommendations: [
      'תרגל זיהוי סט-אפים איכותיים והמתנה להם',
      'עקוב אחר זמני ההמתנה שלך בין עסקאות'
    ],
    color: 'bg-indigo-600'
  }
];
