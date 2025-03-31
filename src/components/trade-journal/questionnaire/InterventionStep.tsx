
import React from 'react';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import QuestionStep from './QuestionStep';

interface InterventionStepProps {
  algoIntervention: string;
  interventionReasons: string[];
  onAlgoInterventionChange: (value: string) => void;
  onInterventionReasonsChange: (reasons: string[]) => void;
  errors: {
    algoIntervention?: { message?: string };
    interventionReasons?: { message?: string };
  };
}

const InterventionStep: React.FC<InterventionStepProps> = ({
  algoIntervention,
  interventionReasons,
  onAlgoInterventionChange,
  onInterventionReasonsChange,
  errors,
}) => {
  const interventionReasonsList = [
    { id: 'fear', label: 'פחד מהפסד' },
    { id: 'fix', label: 'רצון לתקן עסקה' },
    { id: 'distrust', label: 'חוסר אמון באלגו' },
    { id: 'greed', label: 'חמדנות / FOMO' },
  ];

  const handleReasonChange = (checked: boolean | string, reasonId: string) => {
    if (checked) {
      onInterventionReasonsChange([...interventionReasons, reasonId]);
    } else {
      onInterventionReasonsChange(interventionReasons.filter(r => r !== reasonId));
    }
  };

  return (
    <QuestionStep title="שינית פעולה של האלגו היום?" icon="🔁">
      <RadioGroup
        value={algoIntervention}
        onValueChange={onAlgoInterventionChange}
        className="flex flex-col gap-4 mt-6"
      >
        <div className="flex items-center space-x-3 space-x-reverse p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <RadioGroupItem value="none" id="none" className="border-primary" />
          <Label htmlFor="none" className="text-lg font-medium flex items-center gap-2 cursor-pointer">
            <span className="text-2xl">✅</span> לא שיניתי
          </Label>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <RadioGroupItem value="wanted" id="wanted" className="border-primary" />
          <Label htmlFor="wanted" className="text-lg font-medium flex items-center gap-2 cursor-pointer">
            <span className="text-2xl">⚠️</span> רציתי להתערב
          </Label>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <RadioGroupItem value="intervened" id="intervened" className="border-primary" />
          <Label htmlFor="intervened" className="text-lg font-medium flex items-center gap-2 cursor-pointer">
            <span className="text-2xl">❗</span> שיניתי בפועל
          </Label>
        </div>
      </RadioGroup>
      
      {errors.algoIntervention && (
        <p className="text-red-500 text-sm mt-1">{errors.algoIntervention.message}</p>
      )}
      
      {algoIntervention === 'intervened' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-5 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20"
        >
          <h3 className="text-lg font-medium mb-3 text-red-700 dark:text-red-300">מה גרם לך להתערב?</h3>
          <div className="grid grid-cols-2 gap-4">
            {interventionReasonsList.map((reason) => (
              <div key={reason.id} className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id={reason.id}
                  checked={interventionReasons.includes(reason.id)}
                  onCheckedChange={(checked) => handleReasonChange(checked, reason.id)}
                  className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                />
                <Label
                  htmlFor={reason.id}
                  className="text-md font-medium cursor-pointer"
                >
                  {reason.label}
                </Label>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </QuestionStep>
  );
};

export default InterventionStep;
