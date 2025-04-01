
import React from 'react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
  return (
    <QuestionStep title="האם הרגשת דחף להתערב באלגו היום?" icon="🔁">
      <div className="space-y-6">
        <RadioGroup
          value={algoIntervention}
          onValueChange={onAlgoInterventionChange}
          className="flex flex-col space-y-4"
          dir="rtl"
        >
          <div className="flex items-center space-x-2 space-x-reverse">
            <RadioGroupItem value="none" id="intervention-none" />
            <Label htmlFor="intervention-none" className="font-medium">✅ לא בכלל</Label>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <RadioGroupItem value="wanted" id="intervention-wanted" />
            <Label htmlFor="intervention-wanted" className="font-medium">⚠️ רציתי להתערב</Label>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <RadioGroupItem value="intervened" id="intervention-intervened" />
            <Label htmlFor="intervention-intervened" className="font-medium">❗ התערבתי בפועל</Label>
          </div>
        </RadioGroup>
        
        {(algoIntervention === 'intervened' || algoIntervention === 'wanted') && (
          <div className="bg-muted/40 p-4 rounded-md border border-border/40 mt-2 animate-fade-in space-y-3">
            <h3 className="font-medium text-right">
              {algoIntervention === 'intervened' ? "מה הייתה הסיבה להתערבות?" : "מה גרם לך לרצות להתערב?"}
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="fear"
                  checked={interventionReasons.includes('fear')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onInterventionReasonsChange([...interventionReasons, 'fear']);
                    } else {
                      onInterventionReasonsChange(interventionReasons.filter((r) => r !== 'fear'));
                    }
                  }}
                />
                <label
                  htmlFor="fear"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  פחד מהפסד
                </label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="greed"
                  checked={interventionReasons.includes('greed')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onInterventionReasonsChange([...interventionReasons, 'greed']);
                    } else {
                      onInterventionReasonsChange(interventionReasons.filter((r) => r !== 'greed'));
                    }
                  }}
                />
                <label
                  htmlFor="greed"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  חמדנות / רצון להרוויח יותר
                </label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="control"
                  checked={interventionReasons.includes('control')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onInterventionReasonsChange([...interventionReasons, 'control']);
                    } else {
                      onInterventionReasonsChange(interventionReasons.filter((r) => r !== 'control'));
                    }
                  }}
                />
                <label
                  htmlFor="control"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  רצון לשלוט במסחר
                </label>
              </div>
              
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="distrust"
                  checked={interventionReasons.includes('distrust')}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onInterventionReasonsChange([...interventionReasons, 'distrust']);
                    } else {
                      onInterventionReasonsChange(interventionReasons.filter((r) => r !== 'distrust'));
                    }
                  }}
                />
                <label
                  htmlFor="distrust"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  חוסר אמון באלגו
                </label>
              </div>
            </div>
          </div>
        )}
        
        {errors.algoIntervention && (
          <p className="text-red-500 text-sm mt-1">{errors.algoIntervention.message}</p>
        )}
      </div>
    </QuestionStep>
  );
};

export default InterventionStep;
