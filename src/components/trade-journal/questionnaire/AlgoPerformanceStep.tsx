
import React from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import QuestionStep from './QuestionStep';

interface AlgoPerformanceStepProps {
  algoPerformanceChecked: string;
  algoPerformanceNotes: string;
  onAlgoPerformanceCheckedChange: (value: string) => void;
  onAlgoPerformanceNotesChange: (value: string) => void;
  errors: {
    algoPerformanceChecked?: { message?: string };
    algoPerformanceNotes?: { message?: string };
  };
}

const AlgoPerformanceStep: React.FC<AlgoPerformanceStepProps> = ({
  algoPerformanceChecked,
  algoPerformanceNotes,
  onAlgoPerformanceCheckedChange,
  onAlgoPerformanceNotesChange,
  errors,
}) => {
  return (
    <QuestionStep title="האם בדקת את ביצועי האלגו בשבוע האחרון?" icon="📊">
      <div className="space-y-6" dir="rtl">
        <RadioGroup
          value={algoPerformanceChecked}
          onValueChange={onAlgoPerformanceCheckedChange}
          className="flex justify-end gap-8"
        >
          <div className="flex items-center space-x-2 space-x-reverse">
            <RadioGroupItem value="no" id="perf-no" />
            <Label htmlFor="perf-no" className="font-medium">לא</Label>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <RadioGroupItem value="yes" id="perf-yes" />
            <Label htmlFor="perf-yes" className="font-medium">כן</Label>
          </div>
        </RadioGroup>
        
        {algoPerformanceChecked === 'yes' && (
          <div className="mt-4 space-y-2 animate-fade-in">
            <Label htmlFor="algo-notes" className="font-medium">מהן המסקנות העיקריות שהסקת?</Label>
            <Textarea
              id="algo-notes"
              placeholder="תאר את התובנות העיקריות מבדיקת ביצועי האלגו..."
              value={algoPerformanceNotes}
              onChange={(e) => onAlgoPerformanceNotesChange(e.target.value)}
              className="min-h-[120px] text-right"
              dir="rtl"
            />
            
            {errors.algoPerformanceNotes && (
              <p className="text-red-500 text-sm mt-1 text-right">{errors.algoPerformanceNotes.message}</p>
            )}
          </div>
        )}
      </div>
    </QuestionStep>
  );
};

export default AlgoPerformanceStep;
