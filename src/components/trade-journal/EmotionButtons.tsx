
import React from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import EmotionIcon from './EmotionIcon';
import { motion } from 'framer-motion';

interface EmotionButtonsProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  tooltips?: Record<string, string>;
}

const defaultTooltips = {
  '1': 'מצב רוח ירוד מאוד',
  '2': 'מצב רוח לא טוב',
  '3': 'מצב רוח ניטרלי',
  '4': 'מצב רוח טוב',
  '5': 'מצב רוח מצוין',
};

const EmotionButtons: React.FC<EmotionButtonsProps> = ({ 
  value, 
  onChange, 
  label = 'דרג את מצב הרוח שלך', 
  tooltips = defaultTooltips 
}) => {
  return (
    <div className="space-y-2">
      {label && <p className="text-sm text-muted-foreground mb-1">{label}</p>}
      <div className="flex items-center justify-between">
        {['1', '2', '3', '4', '5'].map((rating) => (
          <TooltipProvider key={rating}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(rating)}
                  className={`relative p-3 rounded-full transition-all duration-200 ${
                    value === rating 
                      ? 'bg-secondary ring-2 ring-primary scale-110' 
                      : 'hover:bg-secondary/50'
                  }`}
                >
                  <EmotionIcon emotion={rating} size={32} animated />
                  {value === rating && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full"
                    />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent className="bg-card border-border">
                <p>{tooltips[rating]}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ))}
      </div>
    </div>
  );
};

export default EmotionButtons;
