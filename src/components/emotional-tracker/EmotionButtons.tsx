
import React from 'react';
import { Button } from '@/components/ui/button';
import { enhancedEmotions } from './data/enhanced-emotions';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmotionButtonsProps {
  selectedEmotion: string;
  setSelectedEmotion: (emotion: string) => void;
}

const EmotionButtons: React.FC<EmotionButtonsProps> = ({
  selectedEmotion,
  setSelectedEmotion
}) => {
  // Function to select emotion color based on category
  const getEmotionColor = (emotion: (typeof enhancedEmotions)[0]) => {
    if (!emotion) return '';
    
    const activeClass = selectedEmotion === emotion.id 
      ? 'ring-2 ring-offset-2 ring-offset-background dark:ring-offset-slate-950 ring-primary' 
      : '';
      
    return `${emotion.color} ${activeClass} hover:opacity-90 transition-all duration-150`;
  };
  
  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
      {enhancedEmotions.map(emotion => (
        <TooltipProvider key={emotion.id}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className={`h-auto py-2 text-white flex flex-col items-center justify-center ${getEmotionColor(emotion)}`}
                onClick={() => setSelectedEmotion(emotion.id)}
                variant="ghost"
              >
                <span className="text-sm font-medium">{emotion.label}</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{emotion.description || emotion.label}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ))}
    </div>
  );
};

export default EmotionButtons;
