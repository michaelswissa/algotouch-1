
import { format } from 'date-fns';
import { FormValues, FormattedData } from './schema';

export const formatQuestionnaireData = (data: FormValues): FormattedData => {
  return {
    date: format(new Date(), 'dd/MM/yyyy'),
    emotional: {
      state: data.emotionalState,
      notes: data.emotionalNotes
    },
    intervention: {
      level: data.algoIntervention,
      reasons: data.interventionReasons || []
    },
    market: {
      surprise: data.marketSurprise,
      notes: data.marketSurpriseNotes
    },
    confidence: {
      level: parseInt(data.confidenceLevel)
    },
    algoPerformance: {
      checked: data.algoPerformanceChecked,
      notes: data.algoPerformanceNotes
    },
    risk: {
      percentage: parseFloat(data.riskPercentage),
      comfortLevel: parseInt(data.riskComfortLevel)
    },
    insight: data.dailyInsight
  };
};
