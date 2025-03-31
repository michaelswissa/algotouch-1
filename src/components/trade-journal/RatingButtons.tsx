
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface RatingButtonsProps {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
    tooltip?: string;
    icon?: React.ReactNode;
  }[];
  className?: string;
}

const RatingButtons: React.FC<RatingButtonsProps> = ({ 
  value, 
  onChange, 
  options,
  className
}) => {
  return (
    <div className={cn("flex flex-wrap gap-2 justify-between", className)}>
      {options.map((option) => (
        <TooltipProvider key={option.value}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant={value === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(option.value)}
                className={cn(
                  "flex-1 transition-all duration-200",
                  value === option.value && "bg-primary text-primary-foreground ring-2 ring-primary/20"
                )}
              >
                {option.icon && <span className="mr-1">{option.icon}</span>}
                {option.label}
              </Button>
            </TooltipTrigger>
            {option.tooltip && (
              <TooltipContent className="bg-card">
                <p>{option.tooltip}</p>
              </TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export default RatingButtons;
