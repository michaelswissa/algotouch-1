
import React from 'react';
import { Button } from '@/components/ui/button';

interface EmotionButtonsProps {
  selectedEmotion: string;
  setSelectedEmotion: (emotion: string) => void;
}

export const emotions = [
  { id: 'confidence', label: 'ביטחון', color: 'bg-green-500' },
  { id: 'doubt', label: 'ספק', color: 'bg-blue-500' },
  { id: 'fear', label: 'פחד', color: 'bg-red-500' },
  { id: 'greed', label: 'חמדנות', color: 'bg-orange-500' },
  { id: 'frustration', label: 'תסכול', color: 'bg-purple-500' },
];

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
