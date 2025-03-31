
import React from 'react';
import { Star } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
  tooltips?: Record<number, string>;
  className?: string;
}

const defaultTooltips = {
  1: 'גרוע מאוד',
  2: 'גרוע',
  3: 'סביר',
  4: 'טוב',
  5: 'מצוין',
};

const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  max = 5,
  tooltips = defaultTooltips,
  className
}) => {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map((rating) => (
        <TooltipProvider key={rating}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onChange(rating)}
                className="focus:outline-none transition-transform duration-200 hover:scale-110"
              >
                <Star
                  className={cn(
                    "transition-colors duration-200",
                    rating <= value
                      ? "fill-amber-400 text-amber-400"
                      : "fill-transparent text-muted-foreground"
                  )}
                  size={24}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent className="bg-card">
              <p>{tooltips[rating] || `דירוג ${rating}`}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export default StarRating;
