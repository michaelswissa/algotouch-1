
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import QuestionStep from './QuestionStep';

interface RiskImprovementStepProps {
  riskPercentage: string;
  riskComfortLevel: string;
  onRiskPercentageChange: (value: string) => void;
  onRiskComfortLevelChange: (value: string) => void;
  errors: {
    riskPercentage?: { message?: string };
    riskComfortLevel?: { message?: string };
  };
}

const RiskImprovementStep: React.FC<RiskImprovementStepProps> = ({
  riskPercentage,
  riskComfortLevel,
  onRiskPercentageChange,
  onRiskComfortLevelChange,
  errors,
}) => {
  return (
    <QuestionStep title="שאלות שיפור מהיר" icon="⚙️">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg">אחוז סיכון בעסקה:</Label>
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
              {parseFloat(riskPercentage).toFixed(1)}%
            </div>
          </div>
          
          <Slider
            min={0.1}
            max={2.0}
            step={0.1}
            value={[parseFloat(riskPercentage)]}
            onValueChange={(value) => onRiskPercentageChange(value[0].toString())}
            className="my-6"
          />
          
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>מינימלי (0.1%)</span>
            <span>מקסימלי (2.0%)</span>
          </div>
        </div>
        
        <Separator className="my-6" />
        
        <div className="space-y-4">
          <Label className="block text-lg">
            מה מידת הנוחות שלך עם ההפסדים האפשריים ברמת הסיכון הזו?
          </Label>
          
          <div className="flex justify-between gap-4 mt-6">
            {[1, 2, 3, 4, 5].map((value) => (
              <div 
                key={value} 
                className={`flex-1 text-center p-3 rounded-lg transition-all duration-300 cursor-pointer transform ${
                  parseInt(riskComfortLevel) === value 
                    ? value < 3 
                      ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 scale-105 shadow-md' 
                      : value === 3 
                        ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300 scale-105 shadow-md' 
                        : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 scale-105 shadow-md'
                    : 'bg-muted/40 hover:bg-muted hover:scale-105'
                }`}
                onClick={() => onRiskComfortLevelChange(value.toString())}
              >
                <div className="font-bold text-xl mb-1">{value}</div>
                <div className="text-xs">
                  {value === 1 && '🟥 לא נוח בכלל'}
                  {value === 2 && 'לא נוח'}
                  {value === 3 && '🟨 ניטרלי'}
                  {value === 4 && 'נוח'}
                  {value === 5 && '🟩 נוח לגמרי'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {errors.riskPercentage && (
        <p className="text-red-500 text-sm mt-1">{errors.riskPercentage.message}</p>
      )}
      
      {errors.riskComfortLevel && (
        <p className="text-red-500 text-sm mt-1">{errors.riskComfortLevel.message}</p>
      )}
    </QuestionStep>
  );
};

export default RiskImprovementStep;
