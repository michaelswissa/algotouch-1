
import React from 'react';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface StepHeaderProps {
  currentStep: string;
  steps: Array<{ id: string; label: string }>;
}

const StepHeader: React.FC<StepHeaderProps> = ({ currentStep, steps }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isActive = step.id === currentStep;
          const isCompleted = steps.findIndex(s => s.id === currentStep) > index;
          
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div 
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-center font-medium",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isCompleted && "border-primary bg-primary text-primary-foreground",
                    !isActive && !isCompleted && "border-muted-foreground text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                <div className="mt-2 text-center text-xs">
                  {step.label}
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div 
                  className={cn(
                    "h-0.5 w-full max-w-14",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepHeader;
