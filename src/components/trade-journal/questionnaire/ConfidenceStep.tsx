
import React from 'react';
import { Label } from '@/components/ui/label';
import QuestionStep from './QuestionStep';

interface ConfidenceStepProps {
  confidenceLevel: string;
  onConfidenceLevelChange: (value: string) => void;
  errors: {
    confidenceLevel?: { message?: string };
  };
}

const ConfidenceStep: React.FC<ConfidenceStepProps> = ({
  confidenceLevel,
  onConfidenceLevelChange,
  errors,
}) => {
  return (
    <QuestionStep title="איך היית מדרג את רמת הביטחון שלך במסחר היום?" icon="🧠">
      <div className="mt-8 space-y-8" dir="rtl">
        <div className="relative">
          <div className="absolute -top-10 left-0 right-0 flex justify-between px-2">
            <span className="text-sm font-medium text-green-500">ביטחון גבוה ותחושת שליטה</span>
            <span className="text-sm font-medium text-red-500">חשש מתנודתיות</span>
          </div>
          
          <div className="flex flex-row-reverse justify-between mt-8">
            {[1, 2, 3, 4, 5].map((value) => (
              <div 
                key={value} 
                className={`h-14 w-14 flex items-center justify-center rounded-full border-2 transition-all duration-300 cursor-pointer ${
                  parseInt(confidenceLevel) === value 
                    ? 'bg-primary/20 border-primary scale-110 shadow-md' 
                    : 'bg-card border-muted-foreground/20 hover:bg-primary/5 hover:border-primary/30'
                }`}
                onClick={() => onConfidenceLevelChange(value.toString())}
              >
                <span className="font-bold text-lg">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {errors.confidenceLevel && (
        <p className="text-red-500 text-sm mt-1">{errors.confidenceLevel.message}</p>
      )}
    </QuestionStep>
  );
};

export default ConfidenceStep;
