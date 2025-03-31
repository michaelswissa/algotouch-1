
import React from 'react';
import { motion } from 'framer-motion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import QuestionStep from './QuestionStep';

interface MarketSurpriseStepProps {
  marketSurprise: string;
  marketSurpriseNotes: string;
  onMarketSurpriseChange: (value: string) => void;
  onMarketSurpriseNotesChange: (value: string) => void;
  errors: {
    marketSurprise?: { message?: string };
    marketSurpriseNotes?: { message?: string };
  };
}

const MarketSurpriseStep: React.FC<MarketSurpriseStepProps> = ({
  marketSurprise,
  marketSurpriseNotes,
  onMarketSurpriseChange,
  onMarketSurpriseNotesChange,
  errors,
}) => {
  return (
    <QuestionStep title="האם כיוון השוק הפתיע אותך היום?" icon="📈">
      <RadioGroup
        value={marketSurprise}
        onValueChange={onMarketSurpriseChange}
        className="flex flex-col gap-4 mt-6"
      >
        <div className="flex items-center space-x-3 space-x-reverse p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <RadioGroupItem value="no" id="no-surprise" className="border-primary" />
          <Label htmlFor="no-surprise" className="text-lg font-medium cursor-pointer">
            לא, השוק התנהג כצפוי
          </Label>
        </div>
        
        <div className="flex items-center space-x-3 space-x-reverse p-4 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
          <RadioGroupItem value="yes" id="yes-surprise" className="border-primary" />
          <Label htmlFor="yes-surprise" className="text-lg font-medium cursor-pointer">
            כן, השוק היה שונה מהציפיות שלי
          </Label>
        </div>
      </RadioGroup>
      
      {errors.marketSurprise && (
        <p className="text-red-500 text-sm mt-1">{errors.marketSurprise.message}</p>
      )}
      
      {marketSurprise === 'yes' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 space-y-2 bg-amber-50 dark:bg-amber-900/10 p-4 rounded-lg border border-amber-100 dark:border-amber-900/20"
        >
          <Label htmlFor="marketSurpriseNotes" className="text-amber-800 dark:text-amber-300">מה הפתיע אותך?</Label>
          <Textarea
            id="marketSurpriseNotes"
            placeholder="תאר במה השוק היה שונה מציפיותיך..."
            className="border-amber-200 dark:border-amber-900/30 focus-visible:ring-amber-500 bg-white/80 dark:bg-black/20 resize-none h-24"
            value={marketSurpriseNotes}
            onChange={(e) => onMarketSurpriseNotesChange(e.target.value)}
          />
          {errors.marketSurpriseNotes && (
            <p className="text-red-500 text-sm">
              {errors.marketSurpriseNotes.message}
            </p>
          )}
        </motion.div>
      )}
    </QuestionStep>
  );
};

export default MarketSurpriseStep;
