
import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronLeft, Send } from 'lucide-react';
import { motion } from 'framer-motion';

interface StepNavigationProps {
  currentStep: number;
  stepsCount: number;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  isLastStep: boolean;
}

const StepNavigation: React.FC<StepNavigationProps> = ({
  currentStep,
  stepsCount,
  onNext,
  onPrev,
  onSubmit,
  isSubmitting,
  isLastStep,
}) => {
  return (
    <motion.div 
      className="w-full flex justify-between items-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      dir="rtl"
    >
      {currentStep < stepsCount - 1 ? (
        <Button 
          type="button"
          onClick={onNext}
          className="gap-2 bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300"
        >
          הבא
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : currentStep === stepsCount - 1 ? (
        <Button 
          type="button"
          onClick={onNext}
          className="gap-2 bg-primary hover:bg-primary/90 hover:scale-105 transition-all duration-300"
        >
          סיום
          <ChevronLeft className="h-4 w-4" />
        </Button>
      ) : (
        <Button 
          type="submit"
          disabled={isSubmitting}
          className="gap-2 bg-green-600 hover:bg-green-700 hover:scale-105 transition-all duration-300 disabled:opacity-70"
          onClick={onSubmit}
        >
          {isSubmitting ? 'שולח...' : 'שלח את השאלון'}
          <Send className="h-4 w-4" />
        </Button>
      )}
      
      {currentStep > 0 && currentStep < stepsCount ? (
        <Button 
          type="button" 
          variant="outline" 
          onClick={onPrev}
          className="gap-2 border-primary/20 hover:bg-primary/5 hover:border-primary/30 transition-all duration-300"
        >
          <ChevronRight className="h-4 w-4" />
          הקודם
        </Button>
      ) : (
        <div></div>
      )}
    </motion.div>
  );
};

export default StepNavigation;
