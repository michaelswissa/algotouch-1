
// Define the psychological pattern data structure
export interface PsychologicalPattern {
  id: string;
  name: string;
  description: string;
  category: 'cognitive' | 'emotional' | 'behavioral';
  riskLevel: 'low' | 'medium' | 'high';
  relatedEmotions?: string[];
  interventions?: string[];
}

export const psychologicalPatterns: PsychologicalPattern[] = [
  {
    id: 'fomo',
    name: 'פחד מהחמצה (FOMO)',
    description: 'נטייה להיכנס לעסקאות מפחד החמצת הזדמנות, ללא ניתוח מספק',
    category: 'emotional',
    riskLevel: 'high',
    relatedEmotions: ['fear', 'anxiety', 'greed'],
    interventions: [
      'הגדר מראש תנאי כניסה ברורים ואל תסטה מהם',
      'תעד הזדמנויות שהחמצת ובחן את התוצאות שלהן בדיעבד'
    ]
  },
  {
    id: 'loss_aversion',
    name: 'הימנעות מהפסד',
    description: 'קושי לקבל הפסדים ונטייה להחזיק פוזיציות מפסידות לאורך זמן',
    category: 'cognitive',
    riskLevel: 'high',
    relatedEmotions: ['fear', 'frustration', 'anxiety'],
    interventions: [
      'הגדר סטופים מראש ואל תזיז אותם',
      'תרגל קבלת הפסדים קטנים באופן מודע'
    ]
  },
  {
    id: 'confirmation_bias',
    name: 'הטיית אישור',
    description: 'חיפוש מידע שמאשר את הדעה הקיימת והתעלמות ממידע סותר',
    category: 'cognitive',
    riskLevel: 'medium',
    relatedEmotions: ['confidence', 'doubt'],
    interventions: [
      'חפש באופן אקטיבי מידע שסותר את ההשערה שלך',
      'התייעץ עם סוחרים אחרים לקבלת דעה שונה'
    ]
  },
  {
    id: 'revenge_trading',
    name: 'מסחר נקמה',
    description: 'כניסה לעסקאות כדי "להחזיר" הפסדים קודמים',
    category: 'behavioral',
    riskLevel: 'high',
    relatedEmotions: ['frustration', 'anxiety', 'greed'],
    interventions: [
      'קח הפסקה של לפחות שעה אחרי הפסד משמעותי',
      'הגבל את מספר העסקאות היומי מראש'
    ]
  },
  {
    id: 'overconfidence',
    name: 'ביטחון יתר',
    description: 'אמונה מוגזמת ביכולות או בדיוק של תחזיות',
    category: 'cognitive',
    riskLevel: 'medium',
    relatedEmotions: ['confidence', 'satisfaction'],
    interventions: [
      'נהל יומן תחזיות ובדוק את דיוקן לאורך זמן',
      'שקול תמיד את התרחיש הגרוע ביותר לפני כל עסקה'
    ]
  }
];

// Function to detect psychological patterns based on emotional states and behaviors
export const detectPatterns = (
  emotionHistory: string[], // Array of emotion IDs in chronological order
  tradingBehaviors: string[], // Array of observed trading behavior IDs
  recentLosses: number, // Number of recent consecutive losses
  timeAfterLoss: number // Minutes since last loss
): string[] => {
  const detectedPatterns: string[] = [];
  
  // Check for FOMO pattern
  if (emotionHistory.includes('anxiety') && 
      tradingBehaviors.includes('late_entry_after_move')) {
    detectedPatterns.push('fomo');
  }
  
  // Check for loss aversion
  if (emotionHistory.includes('fear') && 
      (tradingBehaviors.includes('moving_stops_further') || 
       tradingBehaviors.includes('late_exit_losing_trade'))) {
    detectedPatterns.push('loss_aversion');
  }
  
  // Check for confirmation bias
  if (emotionHistory.includes('confidence') && 
      tradingBehaviors.includes('ignoring_contrary_evidence')) {
    detectedPatterns.push('confirmation_bias');
  }
  
  // Check for revenge trading
  if (recentLosses > 0 && 
      timeAfterLoss < 60 && 
      (emotionHistory.includes('frustration') || emotionHistory.includes('anger')) &&
      tradingBehaviors.includes('increased_position_size')) {
    detectedPatterns.push('revenge_trading');
  }
  
  // Check for overconfidence
  if (emotionHistory.includes('confidence') && 
      (tradingBehaviors.includes('increased_position_size') || 
       tradingBehaviors.includes('ignoring_analysis_for_gut'))) {
    detectedPatterns.push('overconfidence');
  }
  
  return detectedPatterns;
};
