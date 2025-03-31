
import React from 'react';
import { motion } from 'framer-motion';

interface StepIndicatorProps {
  steps: { id: string; title: string }[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  return (
    <div className="flex justify-center mt-4">
      {steps.map((step, index) => (
        <motion.div 
          key={step.id}
          initial={{ width: index === currentStep ? '2rem' : '1rem' }}
          animate={{ 
            width: index === currentStep ? '2rem' : '1rem',
            backgroundColor: index <= currentStep 
              ? 'var(--primary)' 
              : 'var(--muted)'
          }}
          transition={{ duration: 0.3 }}
          className={`h-1 mx-1 rounded-full transition-all duration-300`}
        />
      ))}
    </div>
  );
};

export default StepIndicator;
