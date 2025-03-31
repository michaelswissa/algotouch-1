
import React from 'react';
import { Label } from '@/components/ui/label';
import QuestionStep from './QuestionStep';
import { Brain } from 'lucide-react';

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
    <QuestionStep 
      title="איך היית מדרג את רמת הביטחון שלך במסחר היום?" 
      icon={<Brain className="text-primary h-6 w-6" />}
    >
      <div className="mt-8 space-y-8">
        <div className="relative">
          <div className="absolute -top-10 right-0 left-0 flex justify-between px-2">
            <span className="text-base font-medium text-red-500">חשש מתנודתיות</span>
            <span className="text-base font-medium text-green-500">ביטחון גבוה ותחושת שליטה</span>
          </div>
          
          <div className="flex justify-between mt-8">
            {[1, 2, 3, 4, 5].map((value) => (
              <div 
                key={value} 
                className={`h-16 w-16 flex items-center justify-center rounded-full border-2 transition-all duration-300 cursor-pointer ${
                  parseInt(confidenceLevel) === value 
                    ? 'bg-primary/20 border-primary scale-110 shadow-md' 
                    : 'bg-card border-muted-foreground/20 hover:bg-primary/5 hover:border-primary/30'
                }`}
                onClick={() => onConfidenceLevelChange(value.toString())}
              >
                <span className="font-bold text-xl">{value}</span>
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
