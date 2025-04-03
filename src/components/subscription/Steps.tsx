
import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StepsProps {
  currentStep: number;
  className?: string;
  children: React.ReactNode;
}

interface StepProps {
  title: string;
}

export const Steps = ({ currentStep, className, children }: StepsProps) => {
  // Convert children to array and count them
  const childrenArray = React.Children.toArray(children);
  const totalSteps = childrenArray.length;
  
  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between">
        {childrenArray.map((child, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          
          // Create a new element with the needed props
          // Don't pass any data attributes to the Fragment
          return (
            <React.Fragment key={index}>
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
                    stepNumber
                  )}
                </div>
                <div className="mt-2 text-center text-xs">
                  {React.isValidElement(child) && child.props.title}
                </div>
              </div>
              
              {stepNumber < totalSteps && (
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

export const Step = ({ title }: StepProps) => {
  return null; // This component is just a placeholder for the steps structure
};

