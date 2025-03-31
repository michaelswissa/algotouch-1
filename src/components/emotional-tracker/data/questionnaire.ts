
// Define questionnaire data types
export interface QuestionOption {
  id: string;
  label: string;
  value: number;
  color?: string;
}

export interface Question {
  id: string;
  text: string;
  type: 'single-choice' | 'multi-choice' | 'scale' | 'text';
  category: 'pre-trading' | 'post-trading' | 'psychological' | 'behavioral' | 'strategic';
  options?: QuestionOption[];
  placeholder?: string;
  required: boolean;
  helpText?: string;
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  description: string;
  questions: Question[];
}

// Common options for rating scales
export const ratingScale5: QuestionOption[] = [
  { id: 'very-negative', label: 'גרוע מאוד', value: 1, color: 'bg-red-500' },
  { id: 'negative', label: 'גרוע', value: 2, color: 'bg-orange-500' },
  { id: 'neutral', label: 'סביר', value: 3, color: 'bg-yellow-500' },
  { id: 'positive', label: 'טוב', value: 4, color: 'bg-blue-500' },
  { id: 'very-positive', label: 'מצוין', value: 5, color: 'bg-green-500' }
];

export const frequencyScale5: QuestionOption[] = [
  { id: 'never', label: 'אף פעם', value: 1 },
  { id: 'rarely', label: 'לעיתים רחוקות', value: 2 },
  { id: 'sometimes', label: 'לפעמים', value: 3 },
  { id: 'often', label: 'לעיתים קרובות', value: 4 },
  { id: 'always', label: 'תמיד', value: 5 }
];

export const planAdherenceScale: QuestionOption[] = [
  { id: 'not-at-all', label: 'בכלל לא', value: 1 },
  { id: 'rarely', label: 'מעט', value: 2 },
  { id: 'partially', label: 'חלקית', value: 3 },
  { id: 'mostly', label: 'ברובה', value: 4 },
  { id: 'completely', label: 'לחלוטין', value: 5 }
];

// Define the daily questionnaire
export const dailyQuestionnaire = {
  sections: [
    {
      id: 'pre-trading',
      title: 'לפני המסחר',
      description: 'שאלות למילוי לפני תחילת יום המסחר',
      questions: [
        {
          id: 'pre-emotion',
          text: 'איך אתה מרגיש היום לפני תחילת המסחר?',
          type: 'single-choice',
          category: 'psychological',
          options: [], // Will be populated from emotions data
          required: true,
          helpText: 'בחר את הרגש הדומיננטי ביותר שאתה חווה כרגע'
        },
        {
          id: 'sleep-quality',
          text: 'איכות השינה שלך אתמול בלילה',
          type: 'single-choice',
          category: 'psychological',
          options: ratingScale5,
          required: true
        },
        {
          id: 'stress-level',
          text: 'רמת הלחץ הכללית שלך היום',
          type: 'single-choice',
          category: 'psychological',
          options: [
            { id: 'very-low', label: 'נמוכה מאוד', value: 1 },
            { id: 'low', label: 'נמוכה', value: 2 },
            { id: 'medium', label: 'בינונית', value: 3 },
            { id: 'high', label: 'גבוהה', value: 4 },
            { id: 'very-high', label: 'גבוהה מאוד', value: 5 }
          ],
          required: true
        },
        {
          id: 'pre-emotion-notes',
          text: 'הערות נוספות לגבי מצבך הרגשי',
          type: 'text',
          category: 'psychological',
          placeholder: 'תאר את מצב הרוח והרגשות שלך בצורה חופשית...',
          required: false
        }
      ]
    },
    {
      id: 'post-trading',
      title: 'אחרי המסחר',
      description: 'שאלות למילוי בסוף יום המסחר',
      questions: [
        {
          id: 'post-emotion',
          text: 'איך אתה מרגיש עכשיו אחרי יום המסחר?',
          type: 'single-choice',
          category: 'psychological',
          options: [], // Will be populated from emotions data
          required: true
        },
        {
          id: 'trading-day-rating',
          text: 'דירוג יום המסחר',
          type: 'single-choice',
          category: 'strategic',
          options: ratingScale5,
          required: true
        },
        {
          id: 'followed-plan',
          text: 'האם עקבת אחר תוכנית המסחר שלך?',
          type: 'single-choice',
          category: 'behavioral',
          options: planAdherenceScale,
          required: true
        },
        {
          id: 'daily-reflection',
          text: 'רפלקציה יומית',
          type: 'text',
          category: 'psychological',
          placeholder: 'תאר את החוויה הרגשית שלך במהלך יום המסחר. מה השפיע על הרגשות שלך? אילו החלטות היו מושפעות מרגשות?',
          required: false
        },
        {
          id: 'key-insights',
          text: 'תובנות עיקריות מהיום',
          type: 'text',
          category: 'strategic',
          placeholder: 'מה למדת על עצמך היום? אילו דפוסים זיהית? מה תעשה אחרת מחר?',
          required: false
        }
      ]
    },
    {
      id: 'behavioral-patterns',
      title: 'דפוסי התנהגות',
      description: 'זיהוי דפוסי התנהגות במסחר',
      questions: [
        {
          id: 'early-exit-profitable-trades',
          text: 'האם יצאת מעסקאות רווחיות מוקדם מדי?',
          type: 'single-choice',
          category: 'behavioral',
          options: frequencyScale5,
          required: true
        },
        {
          id: 'held-losing-positions',
          text: 'האם החזקת עסקאות מפסידות זמן רב מדי?',
          type: 'single-choice',
          category: 'behavioral',
          options: frequencyScale5,
          required: true
        },
        {
          id: 'moved-stops',
          text: 'האם הזזת סטופים רחוק יותר מהמחיר במהלך עסקה?',
          type: 'single-choice',
          category: 'behavioral',
          options: frequencyScale5,
          required: true
        },
        {
          id: 'traded-without-edge',
          text: 'האם נכנסת לעסקאות ללא יתרון ברור?',
          type: 'single-choice',
          category: 'behavioral',
          options: frequencyScale5,
          required: true
        }
      ]
    }
  ]
};

// Function to calculate scores based on questionnaire answers
export const calculateScores = (answers: { [key: string]: any }) => {
  // These are scoring categories for emotional trading patterns
  const scores = {
    emotionalControl: 0,
    planAdherence: 0,
    disciplinedExecution: 0,
    selfAwareness: 0
  };
  
  // Calculate emotional control score
  if (answers['stress-level']) {
    scores.emotionalControl += 5 - parseInt(answers['stress-level'].toString().charAt(answers['stress-level'].length - 1));
  }
  
  // Calculate plan adherence
  if (answers['followed-plan']) {
    const adherenceValues: Record<string, number> = {
      'completely': 5,
      'mostly': 4,
      'partially': 3,
      'rarely': 2,
      'not-at-all': 1
    };
    scores.planAdherence += adherenceValues[answers['followed-plan']] || 0;
  }
  
  // Calculate disciplined execution
  if (answers['early-exit-profitable-trades']) {
    scores.disciplinedExecution += answers['early-exit-profitable-trades'] === 'never' ? 5 : 
                                   answers['early-exit-profitable-trades'] === 'rarely' ? 4 :
                                   answers['early-exit-profitable-trades'] === 'sometimes' ? 3 :
                                   answers['early-exit-profitable-trades'] === 'often' ? 2 : 1;
  }
  
  if (answers['held-losing-positions']) {
    scores.disciplinedExecution += answers['held-losing-positions'] === 'never' ? 5 : 
                                   answers['held-losing-positions'] === 'rarely' ? 4 :
                                   answers['held-losing-positions'] === 'sometimes' ? 3 :
                                   answers['held-losing-positions'] === 'often' ? 2 : 1;
  }
  
  // Calculate self-awareness
  if (answers['daily-reflection'] && answers['daily-reflection'].length > 50) {
    scores.selfAwareness += 3;
  } else if (answers['daily-reflection'] && answers['daily-reflection'].length > 20) {
    scores.selfAwareness += 2;
  } else if (answers['daily-reflection']) {
    scores.selfAwareness += 1;
  }
  
  if (answers['key-insights'] && answers['key-insights'].length > 50) {
    scores.selfAwareness += 2;
  } else if (answers['key-insights']) {
    scores.selfAwareness += 1;
  }
  
  // Normalize scores to be out of 10
  scores.emotionalControl = Math.min(Math.round(scores.emotionalControl * 2), 10);
  scores.planAdherence = Math.min(Math.round(scores.planAdherence * 2), 10);
  scores.disciplinedExecution = Math.min(Math.round(scores.disciplinedExecution), 10);
  scores.selfAwareness = Math.min(Math.round(scores.selfAwareness * 2), 10);
  
  return scores;
};

// Function to generate recommendations based on scores and emotion history
export const generateRecommendations = (
  scores: ReturnType<typeof calculateScores>,
  emotionHistory: string[]
) => {
  const recommendations = {
    strengths: [] as string[],
    weaknesses: [] as string[],
    actionItems: [] as string[],
    focusArea: ''
  };
  
  // Identify strengths
  if (scores.emotionalControl >= 7) {
    recommendations.strengths.push('שליטה רגשית טובה בזמן מסחר');
  }
  
  if (scores.planAdherence >= 7) {
    recommendations.strengths.push('הקפדה על תוכנית המסחר');
  }
  
  if (scores.disciplinedExecution >= 7) {
    recommendations.strengths.push('משמעת בביצוע עסקאות');
  }
  
  if (scores.selfAwareness >= 7) {
    recommendations.strengths.push('מודעות עצמית גבוהה');
  }
  
  // If no strengths identified, add a default one
  if (recommendations.strengths.length === 0) {
    recommendations.strengths.push('התמדה בתיעוד ומעקב');
  }
  
  // Identify weaknesses and action items
  if (scores.emotionalControl < 5) {
    recommendations.weaknesses.push('קושי בשליטה רגשית');
    recommendations.actionItems.push('תרגל נשימות עמוקות לפני כל החלטת מסחר');
    recommendations.actionItems.push('קח הפסקה של 10 דקות לאחר כל הפסד');
  }
  
  if (scores.planAdherence < 5) {
    recommendations.weaknesses.push('סטייה מתוכנית המסחר');
    recommendations.actionItems.push('כתוב את תוכנית המסחר היומית על דף ושים אותו ליד מסך המחשב');
    recommendations.actionItems.push('סמן V ליד כל החלטה שעמדה בקריטריונים של התוכנית');
  }
  
  if (scores.disciplinedExecution < 5) {
    recommendations.weaknesses.push('חוסר משמעת בביצוע עסקאות');
    recommendations.actionItems.push('הגדר מראש את נקודות הכניסה והיציאה ואל תשנה אותן');
    recommendations.actionItems.push('השתמש בהוראות אוטומטיות במקום לבצע פעולות ידניות');
  }
  
  if (scores.selfAwareness < 5) {
    recommendations.weaknesses.push('מודעות עצמית נמוכה');
    recommendations.actionItems.push('הקדש 10 דקות בסוף כל יום מסחר לתיעוד התחושות שלך');
    recommendations.actionItems.push('בחן את הקשר בין מצב הרוח שלך לבין איכות ההחלטות');
  }
  
  // Determine focus area based on lowest score
  const scoreMap = [
    { name: 'שליטה רגשית', score: scores.emotionalControl },
    { name: 'הקפדה על תוכנית', score: scores.planAdherence },
    { name: 'משמעת בביצוע', score: scores.disciplinedExecution },
    { name: 'מודעות עצמית', score: scores.selfAwareness }
  ];
  
  scoreMap.sort((a, b) => a.score - b.score);
  recommendations.focusArea = scoreMap[0].name;
  
  // Add emotion-specific recommendations
  const negativeEmotionsCount = emotionHistory.filter(
    e => ['fear', 'anxiety', 'frustration', 'greed', 'doubt'].includes(e)
  ).length;
  
  if (negativeEmotionsCount > emotionHistory.length / 2) {
    recommendations.weaknesses.push('ריבוי רגשות שליליים');
    recommendations.actionItems.push('תרגל מדיטציה במשך 5 דקות לפני תחילת יום המסחר');
  }
  
  return recommendations;
};
