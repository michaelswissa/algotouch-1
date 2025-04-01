
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import EmotionalStateStep from './EmotionalStateStep';
import InterventionStep from './InterventionStep';
import MarketSurpriseStep from './MarketSurpriseStep';
import ConfidenceStep from './ConfidenceStep';
import AlgoPerformanceStep from './AlgoPerformanceStep';
import RiskImprovementStep from './RiskImprovementStep';
import DailyInsightStep from './DailyInsightStep';
import CompletionStep from './CompletionStep';
import { FormValues } from './schema';

interface StepContentProps {
  currentStep: number;
  direction: number;
  watch: (name: string) => any;
  setValue: (name: any, value: any) => void;
  errors: any;
}

const StepContent: React.FC<StepContentProps> = ({
  currentStep,
  direction,
  watch,
  setValue,
  errors,
}) => {
  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? -100 : 100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? -100 : 100,
      opacity: 0
    })
  };

  return (
    <AnimatePresence initial={false} custom={direction} mode="wait">
      <motion.div
        key={currentStep}
        custom={direction}
        variants={variants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: "tween", duration: 0.3 }}
        className="min-h-[400px]"
      >
        {currentStep === 0 && (
          <EmotionalStateStep 
            emotionalState={watch('emotionalState')}
            emotionalNotes={watch('emotionalNotes')}
            onEmotionalStateChange={(value) => setValue('emotionalState', value)}
            onEmotionalNotesChange={(value) => setValue('emotionalNotes', value)}
            errors={errors}
          />
        )}
        
        {currentStep === 1 && (
          <InterventionStep 
            algoIntervention={watch('algoIntervention')}
            interventionReasons={watch('interventionReasons') || []}
            onAlgoInterventionChange={(value) => setValue('algoIntervention', value as 'none' | 'wanted' | 'intervened')}
            onInterventionReasonsChange={(reasons) => setValue('interventionReasons', reasons)}
            errors={errors}
          />
        )}
        
        {currentStep === 2 && (
          <MarketSurpriseStep 
            marketSurprise={watch('marketSurprise')}
            marketSurpriseNotes={watch('marketSurpriseNotes') || ''}
            onMarketSurpriseChange={(value) => setValue('marketSurprise', value as 'no' | 'yes')}
            onMarketSurpriseNotesChange={(value) => setValue('marketSurpriseNotes', value)}
            errors={errors}
          />
        )}
        
        {currentStep === 3 && (
          <ConfidenceStep 
            confidenceLevel={watch('confidenceLevel')}
            onConfidenceLevelChange={(value) => setValue('confidenceLevel', value)}
            errors={errors}
          />
        )}
        
        {currentStep === 4 && (
          <AlgoPerformanceStep 
            algoPerformanceChecked={watch('algoPerformanceChecked')}
            algoPerformanceNotes={watch('algoPerformanceNotes') || ''}
            onAlgoPerformanceCheckedChange={(value) => setValue('algoPerformanceChecked', value as 'no' | 'yes')}
            onAlgoPerformanceNotesChange={(value) => setValue('algoPerformanceNotes', value)}
            errors={errors}
          />
        )}
        
        {currentStep === 5 && (
          <RiskImprovementStep 
            riskPercentage={watch('riskPercentage')}
            riskComfortLevel={watch('riskComfortLevel')}
            onRiskPercentageChange={(value) => setValue('riskPercentage', value)}
            onRiskComfortLevelChange={(value) => setValue('riskComfortLevel', value)}
            errors={errors}
          />
        )}
        
        {currentStep === 6 && (
          <DailyInsightStep 
            dailyInsight={watch('dailyInsight') || ''}
            onDailyInsightChange={(value) => setValue('dailyInsight', value)}
            errors={errors}
          />
        )}
        
        {currentStep === 7 && (
          <CompletionStep />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default StepContent;
