
import React from 'react';
import { Button } from '@/components/ui/button';
import { emotions, Emotion } from './data/emotions';

interface EmotionButtonsProps {
  selectedEmotion: string;
  setSelectedEmotion: (emotion: string) => void;
}

const EmotionButtons: React.FC<EmotionButtonsProps> = ({ 
  selectedEmotion, 
  setSelectedEmotion 
}) => {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {emotions.map((emotion) => (
        <Button
          key={emotion.id}
          variant={selectedEmotion === emotion.id ? "default" : "outline"}
          className={`${selectedEmotion === emotion.id ? emotion.color + ' text-white' : ''} flex-1 min-w-24`}
          onClick={() => setSelectedEmotion(emotion.id)}
        >
          {emotion.label}
        </Button>
      ))}
    </div>
  );
};

export default EmotionButtons;
