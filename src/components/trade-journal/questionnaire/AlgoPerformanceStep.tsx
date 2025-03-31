
import React from 'react';
import { motion } from 'framer-motion';
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
      <RadioGroup
        value={algoPerformanceChecked}
        onValueChange={onAlgoPerformanceCheckedChange}
        className="flex flex-col gap-4 mt-6"
      >
        <div className="flex items-center space-x-3 space-x-reverse p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <RadioGroupItem value="no" id="not-checked" className="border-primary" />
          <Label htmlFor="not-checked" className="text-lg font-medium cursor-pointer">
            לא הספקתי
          </Label>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <RadioGroupItem value="yes" id="checked" className="border-primary" />
          <Label htmlFor="checked" className="text-lg font-medium cursor-pointer">
            כן בדקתי
          </Label>
        </div>
      </RadioGroup>
      
      {errors.algoPerformanceChecked && (
        <p className="text-red-500 text-sm mt-1">{errors.algoPerformanceChecked.message}</p>
      )}
      
      {algoPerformanceChecked === 'yes' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-2 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30"
        >
          <Label htmlFor="algoPerformanceNotes" className="text-blue-800 dark:text-blue-300">תובנה מהבדיקה שלך:</Label>
          <Textarea
            id="algoPerformanceNotes"
            placeholder="שתף תובנה מבדיקת הביצועים..."
            className="border-blue-200 dark:border-blue-900/30 focus-visible:ring-blue-500 bg-white/80 dark:bg-black/20 resize-none h-24"
            value={algoPerformanceNotes}
            onChange={(e) => onAlgoPerformanceNotesChange(e.target.value)}
          />
          {errors.algoPerformanceNotes && (
            <p className="text-red-500 text-sm">
              {errors.algoPerformanceNotes.message}
            </p>
          )}
        </motion.div>
      )}
    </QuestionStep>
  );
};

export default AlgoPerformanceStep;
