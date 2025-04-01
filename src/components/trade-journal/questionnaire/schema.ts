
import { z } from 'zod';

// Define form schema
export const formSchema = z.object({
  emotionalState: z.string(),
  emotionalNotes: z.string().optional(),
  algoIntervention: z.enum(['none', 'wanted', 'intervened']),
  interventionReasons: z.array(z.string()).optional(),
  marketSurprise: z.enum(['no', 'yes']),
  marketSurpriseNotes: z.string().optional(),
  confidenceLevel: z.string(),
  algoPerformanceChecked: z.enum(['no', 'yes']),
  algoPerformanceNotes: z.string().optional(),
  riskPercentage: z.string(),
  riskComfortLevel: z.string(),
  dailyInsight: z.string().optional(),
}).refine(
  (data) => {
    if (data.algoPerformanceChecked === 'yes') {
      return !!data.algoPerformanceNotes;
    }
    return true;
  },
  {
    message: "אנא הזן את התובנה מהבדיקה",
    path: ["algoPerformanceNotes"],
  }
).refine(
  (data) => {
    if (data.marketSurprise === 'yes') {
      return !!data.marketSurpriseNotes;
    }
    return true;
  },
  {
    message: "אנא תאר מה הפתיע אותך",
    path: ["marketSurpriseNotes"],
  }
).refine(
  (data) => {
    if (['😣', '😕'].includes(data.emotionalState)) {
      return !!data.emotionalNotes;
    }
    return true;
  },
  {
    message: "אנא שתף מה השפיע עליך היום",
    path: ["emotionalNotes"],
  }
);

export type FormValues = z.infer<typeof formSchema>;

export interface QuestionnaireFormProps {
  onSubmit: (data: any) => void;
}

export interface FormattedData {
  date: string;
  emotional: {
    state: string;
    notes: string | undefined;
  };
  intervention: {
    level: string;
    reasons: string[];
  };
  market: {
    surprise: string;
    notes: string | undefined;
  };
  confidence: {
    level: number;
  };
  algoPerformance: {
    checked: string;
    notes: string | undefined;
  };
  risk: {
    percentage: number;
    comfortLevel: number;
  };
  insight: string | undefined;
}
