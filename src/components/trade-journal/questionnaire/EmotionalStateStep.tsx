
import React from 'react';
import { motion } from 'framer-motion';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import QuestionStep from './QuestionStep';

interface EmotionalStateStepProps {
  emotionalState: string;
  emotionalNotes: string;
  onEmotionalStateChange: (value: string) => void;
  onEmotionalNotesChange: (value: string) => void;
  errors: {
    emotionalState?: { message?: string };
    emotionalNotes?: { message?: string };
  };
}

const EmotionalStateStep: React.FC<EmotionalStateStepProps> = ({
  emotionalState,
  emotionalNotes,
  onEmotionalStateChange,
  onEmotionalNotesChange,
  errors,
}) => {
  const emotionalIcons = [
    { value: '😣', label: 'מתוח' },
    { value: '😕', label: 'לא רגוע' },
    { value: '😐', label: 'ניטרלי' },
    { value: '🙂', label: 'רגוע' },
    { value: '😎', label: 'מפוקס ובטוח' }
  ];

  return (
    <QuestionStep title="איך הרגשת במהלך המסחר היום?" icon="😌">
      <div className="grid grid-cols-5 gap-2 mt-6">
        {emotionalIcons.map((icon) => (
          <div 
            key={icon.value} 
            className="flex flex-col items-center gap-2"
          >
            <button
              type="button"
              onClick={() => onEmotionalStateChange(icon.value)}
              className={`text-4xl p-3 rounded-full transition-all duration-300 transform ${
                emotionalState === icon.value 
                  ? 'bg-primary/15 ring-2 ring-primary scale-110 shadow-lg' 
                  : 'hover:bg-primary/10 hover:scale-105'
              }`}
              aria-label={icon.label}
            >
              {icon.value}
            </button>
            <span className="text-sm font-medium">{icon.label}</span>
          </div>
        ))}
      </div>
      
      {errors.emotionalState && (
        <p className="text-red-500 text-sm mt-1">{errors.emotionalState.message}</p>
      )}
      
      {(emotionalState === '😣' || emotionalState === '😕') && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-2 bg-card/60 p-4 rounded-lg border border-border/40"
        >
          <Label htmlFor="emotionalNotes" className="text-primary/90">תרצה לשתף מה השפיע עליך היום?</Label>
          <Textarea
            id="emotionalNotes"
            placeholder="שתף את ההרגשה שלך..."
            className="border-primary/20 focus-visible:ring-primary resize-none h-24"
            value={emotionalNotes}
            onChange={(e) => onEmotionalNotesChange(e.target.value)}
          />
          {errors.emotionalNotes && (
            <p className="text-red-500 text-sm">
              {errors.emotionalNotes.message}
            </p>
          )}
        </motion.div>
      )}
    </QuestionStep>
  );
};

export default EmotionalStateStep;
