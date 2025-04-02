
import React from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle } from 'lucide-react';

interface StepsProps {
  currentStep: number;
  children: React.ReactNode;
  className?: string;
}

export const Steps: React.FC<StepsProps> = ({ currentStep, children, className }) => {
  const steps = React.Children.toArray(children);
  
  return (
    <div className={cn('w-full', className)}>
      <div className="flex items-center justify-center">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step */}
            {React.cloneElement(step as React.ReactElement, {
              stepNumber: index + 1,
              isActive: currentStep === index + 1,
              isCompleted: currentStep > index + 1
            })}
            
            {/* Line between steps */}
            {index < steps.length - 1 && (
              <div 
                className={cn(
                  'h-[2px] flex-1 transition-colors mx-3',
                  currentStep > index + 1 ? 'bg-primary' : 'bg-border'
                )}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

interface StepProps {
  title: string;
  stepNumber?: number;
  isActive?: boolean;
  isCompleted?: boolean;
}

export const Step: React.FC<StepProps> = ({ 
  title, 
  stepNumber, 
  isActive, 
  isCompleted 
}) => {
  return (
    <div className="flex flex-col items-center">
      <div 
        className={cn(
          'w-10 h-10 rounded-full flex items-center justify-center transition-colors',
          isActive ? 'border-2 border-primary bg-primary/10 text-primary' : 
            isCompleted ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
        )}
      >
        {isCompleted ? (
          <Check className="h-5 w-5" />
        ) : (
          <span>{stepNumber}</span>
        )}
      </div>
      <span 
        className={cn(
          'text-sm mt-2 transition-colors text-center',
          isActive ? 'text-primary font-medium' : 
            isCompleted ? 'text-foreground' : 'text-muted-foreground'
        )}
      >
        {title}
      </span>
    </div>
  );
};
