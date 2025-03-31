
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

import StepIndicator from './StepIndicator';
import StepNavigation from './StepNavigation';
import EmotionalStateStep from './EmotionalStateStep';
import InterventionStep from './InterventionStep';
import MarketSurpriseStep from './MarketSurpriseStep';
import ConfidenceStep from './ConfidenceStep';
import AlgoPerformanceStep from './AlgoPerformanceStep';
import RiskImprovementStep from './RiskImprovementStep';
import DailyInsightStep from './DailyInsightStep';
import CompletionStep from './CompletionStep';

// Define form schema
const formSchema = z.object({
  emotionalState: z.string(),
  emotionalNotes: z.string().optional(),
  algoIntervention: z.enum(['none', 'wanted', 'intervened']),
  interventionReasons: z.array(z.string()).optional(),
  marketSurprise: z.enum(['no', 'yes']),
  marketSurpriseNotes: z.string().optional(),
  confidenceLevel: z.string(),
  algoPerformanceChecked: z.enum(['no', 'yes']),
  algoPerformanceNotes: z.string().optional(),
  riskPercentage: z.string(),
  riskComfortLevel: z.string(),
  dailyInsight: z.string().optional(),
}).refine(
  (data) => {
    if (data.algoPerformanceChecked === 'yes') {
      return !!data.algoPerformanceNotes;
    }
    return true;
  },
  {
    message: "אנא הזן את התובנה מהבדיקה",
    path: ["algoPerformanceNotes"],
  }
).refine(
  (data) => {
    if (data.marketSurprise === 'yes') {
      return !!data.marketSurpriseNotes;
    }
    return true;
  },
  {
    message: "אנא תאר מה הפתיע אותך",
    path: ["marketSurpriseNotes"],
  }
).refine(
  (data) => {
    if (['😣', '😕'].includes(data.emotionalState)) {
      return !!data.emotionalNotes;
    }
    return true;
  },
  {
    message: "אנא שתף מה השפיע עליך היום",
    path: ["emotionalNotes"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface QuestionnaireFormProps {
  onSubmit: (data: any) => void;
}

const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({ onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emotionalState: '',
      emotionalNotes: '',
      algoIntervention: 'none',
      interventionReasons: [],
      marketSurprise: 'no',
      marketSurpriseNotes: '',
      confidenceLevel: '3',
      algoPerformanceChecked: 'no',
      algoPerformanceNotes: '',
      riskPercentage: '0.5',
      riskComfortLevel: '3',
      dailyInsight: '',
    }
  });

  const steps = [
    { id: 'emotional', title: '😌 איך הרגשת במהלך המסחר היום?' },
    { id: 'intervention', title: '🔁 שינית פעולה של האלגו היום?' },
    { id: 'market', title: '📈 האם כיוון השוק הפתיע אותך היום?' },
    { id: 'confidence', title: '🧠 איך היית מדרג את רמת הביטחון שלך במסחר היום?' },
    { id: 'performance', title: '📊 האם בדקת את ביצועי האלגו בשבוע האחרון?' },
    { id: 'risk', title: '⚙️ שאלות שיפור מהיר' },
    { id: 'insight', title: '✍️ תובנה יומית – מה לקחת מהיום הזה?' },
  ];

  const nextStep = async () => {
    // Validate current step before proceeding
    const fieldsToValidate: Record<number, (keyof FormValues)[]> = {
      0: ['emotionalState', 'emotionalNotes'],
      1: ['algoIntervention', 'interventionReasons'],
      2: ['marketSurprise', 'marketSurpriseNotes'],
      3: ['confidenceLevel'],
      4: ['algoPerformanceChecked', 'algoPerformanceNotes'],
      5: ['riskPercentage', 'riskComfortLevel'],
      6: ['dailyInsight']
    };
    
    const isStepValid = await trigger(fieldsToValidate[currentStep]);
    
    if (isStepValid) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep(currentStep - 1);
  };

  const onFormSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    // Format the data for the report
    const formattedData = {
      date: format(new Date(), 'dd/MM/yyyy'),
      emotional: {
        state: data.emotionalState,
        notes: data.emotionalNotes
      },
      intervention: {
        level: data.algoIntervention,
        reasons: data.interventionReasons || []
      },
      market: {
        surprise: data.marketSurprise,
        notes: data.marketSurpriseNotes
      },
      confidence: {
        level: parseInt(data.confidenceLevel)
      },
      algoPerformance: {
        checked: data.algoPerformanceChecked,
        notes: data.algoPerformanceNotes
      },
      risk: {
        percentage: parseFloat(data.riskPercentage),
        comfortLevel: parseInt(data.riskComfortLevel)
      },
      insight: data.dailyInsight
    };
    
    // Submit the data
    onSubmit(formattedData);
    setIsSubmitting(false);
  };

  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <Card className="overflow-hidden shadow-lg border-primary/20 bg-gradient-to-br from-card/90 to-card hover:shadow-xl transition-all duration-500">
        <CardHeader className="relative pb-2 bg-primary/5">
          <CardTitle className="text-2xl text-center font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            🚀 שאלון סוחר יומי – AlgoTouch
          </CardTitle>
          
          <StepIndicator steps={steps} currentStep={currentStep} />
        </CardHeader>
        
        <CardContent className="p-6">
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
        </CardContent>
        
        <CardFooter className="p-6 border-t border-border/30 bg-muted/20">
          <StepNavigation 
            currentStep={currentStep}
            stepsCount={steps.length + 1}
            onNext={nextStep}
            onPrev={prevStep}
            onSubmit={handleSubmit(onFormSubmit)}
            isSubmitting={isSubmitting}
            isLastStep={currentStep === steps.length}
          />
        </CardFooter>
      </Card>
    </form>
  );
};

export default QuestionnaireForm;
