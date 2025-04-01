
export const questionnaireSteps = [
  { id: 'emotional', title: '😌 איך הרגשת במהלך המסחר היום?' },
  { id: 'intervention', title: '🔁 האם הרגשת דחף להתערב באלגו היום?' },
  { id: 'market', title: '📈 האם כיוון השוק הפתיע אותך היום?' },
  { id: 'confidence', title: '🧠 איך היית מדרג את רמת הביטחון שלך במסחר היום?' },
  { id: 'performance', title: '📊 האם בדקת את ביצועי האלגו בשבוע האחרון?' },
  { id: 'risk', title: '⚙️ רמת סיכון' },
  { id: 'insight', title: '✍️ תובנה יומית – מה לקחת מהיום הזה?' },
];

export const fieldsToValidateByStep: Record<number, string[]> = {
  0: ['emotionalState', 'emotionalNotes'],
  1: ['algoIntervention', 'interventionReasons'],
  2: ['marketSurprise', 'marketSurpriseNotes'],
  3: ['confidenceLevel'],
  4: ['algoPerformanceChecked', 'algoPerformanceNotes'],
  5: ['riskPercentage', 'riskComfortLevel'],
  6: ['dailyInsight']
};
