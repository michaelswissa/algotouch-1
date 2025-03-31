
import React from 'react';
import { Button } from '@/components/ui/button';
import { enhancedEmotions } from './data/enhanced-emotions';

interface EmotionButtonsProps {
  selectedEmotion: string;
  setSelectedEmotion: (emotion: string) => void;
}

const EmotionButtons: React.FC<EmotionButtonsProps> = ({ 
  selectedEmotion, 
  setSelectedEmotion 
}) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center rtl">
      {enhancedEmotions.map((emotion) => (
        <Button
          key={emotion.id}
          variant={selectedEmotion === emotion.id ? "default" : "outline"}
          className={`${selectedEmotion === emotion.id ? emotion.color + ' text-white shadow-md' : ''} 
            flex-1 min-w-[100px] transition-all duration-300 hover:shadow-md
            ${selectedEmotion === emotion.id ? 'transform scale-105' : ''}
          `}
          onClick={() => setSelectedEmotion(emotion.id)}
        >
          {emotion.label}
        </Button>
      ))}
    </div>
  );
};

export default EmotionButtons;
