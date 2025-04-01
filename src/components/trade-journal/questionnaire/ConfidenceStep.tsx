
import React from 'react';
import { Brain } from 'lucide-react';
import QuestionStep from './QuestionStep';
import StarRating from '../StarRating';

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
  const confidenceTooltips = {
    1: 'חשש מתנודתיות',
    2: 'תחושת חוסר בטחון',
    3: 'תחושה נייטרלית',
    4: 'תחושת בטחון',
    5: 'ביטחון גבוה ותחושת שליטה'
  };

  return (
    <QuestionStep 
      title="איך היית מדרג את רמת הביטחון שלך במסחר היום?" 
      icon={<Brain className="text-primary h-6 w-6" />}
    >
      <div className="mt-10 space-y-10">
        <div className="relative bg-muted/20 p-6 rounded-lg border border-border/20">
          <div className="absolute -top-2 right-0 left-0 flex justify-between px-2">
            <span className="text-base font-medium text-red-500 bg-background px-2">חשש מתנודתיות</span>
            <span className="text-base font-medium text-green-500 bg-background px-2">ביטחון גבוה ותחושת שליטה</span>
          </div>
          
          <div className="flex justify-center mt-8">
            <StarRating 
              value={parseInt(confidenceLevel)} 
              onChange={(value) => onConfidenceLevelChange(value.toString())} 
              tooltips={confidenceTooltips}
              className="scale-150 mb-4 mt-2"
            />
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
