
import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import QuestionStep from './QuestionStep';

interface DailyInsightStepProps {
  dailyInsight: string;
  onDailyInsightChange: (value: string) => void;
  errors: {
    dailyInsight?: { message?: string };
  };
}

const DailyInsightStep: React.FC<DailyInsightStepProps> = ({
  dailyInsight,
  onDailyInsightChange,
  errors,
}) => {
  return (
    <QuestionStep title="תובנה יומית – מה לקחת מהיום הזה?" icon="✍️">
      <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 mt-4 mb-6">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          תכתוב כאן כל דבר שתרצה לזכור: למידה, טעויות, תובנות או דברים לשמר.
        </p>
      </div>
      
      <Textarea
        placeholder="שתף את התובנות שלך מהיום..."
        className="min-h-[200px] border-primary/20 focus-visible:ring-primary resize-none"
        value={dailyInsight}
        onChange={(e) => onDailyInsightChange(e.target.value)}
      />
      
      <div className="p-4 bg-primary/5 rounded-lg mt-6">
        <h3 className="font-medium text-primary mb-2">🗂️ שמירה בפתקים</h3>
        <p className="text-sm text-muted-foreground">
          בעת שליחה, הטופס נשמר אוטומטית כפתק יומי עם כל המידע החשוב שהזנת.
        </p>
      </div>
      
      {errors.dailyInsight && (
        <p className="text-red-500 text-sm mt-1">{errors.dailyInsight.message}</p>
      )}
    </QuestionStep>
  );
};

export default DailyInsightStep;
