
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
    <div className={cn("w-full", className)} role="navigation" aria-label="Progress Steps">
      <div className="flex items-center justify-between">
        {childrenArray.map((child, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = stepNumber < currentStep;
          const stepStatus = isActive ? 'current' : isCompleted ? 'complete' : 'upcoming';
          
          // Extract title from the Step component props
          const title = React.isValidElement(child) ? child.props.title : '';
          
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
                  aria-current={isActive ? 'step' : undefined}
                  aria-label={`${title} ${isActive ? '(current step)' : isCompleted ? '(completed)' : ''}`}
                  role="status"
                  aria-valuetext={stepStatus}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <span aria-hidden="true">{stepNumber}</span>
                  )}
                </div>
                <div className="mt-2 text-center text-xs">
                  {title}
                </div>
              </div>
              
              {stepNumber < totalSteps && (
                <div 
                  className={cn(
                    "h-0.5 w-full max-w-14",
                    isCompleted ? "bg-primary" : "bg-muted"
                  )}
                  aria-hidden="true"
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
  // This component is just a placeholder for the steps structure
  return null;
};
