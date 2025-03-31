
import React from 'react';
import { Smile, Frown, Meh, ThumbsUp, AlertCircle, Activity, Check, Heart, Zap, Brain } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmotionIconProps {
  emotion: string;
  size?: number;
  className?: string;
  animated?: boolean;
}

const EmotionIcon: React.FC<EmotionIconProps> = ({ 
  emotion, 
  size = 24,
  className,
  animated = false
}) => {
  const getIcon = () => {
    switch (emotion) {
      case '1':
        return <Frown size={size} className={cn("text-red-500", className)} />;
      case '2':
        return <AlertCircle size={size} className={cn("text-orange-500", className)} />;
      case '3':
        return <Meh size={size} className={cn("text-yellow-500", className)} />;
      case '4':
        return <Smile size={size} className={cn("text-blue-500", className)} />;
      case '5':
        return <ThumbsUp size={size} className={cn("text-green-500", className)} />;
      // Additional mappings for different icon sets
      case 'fear':
        return <Frown size={size} className={cn("text-red-500", className)} />;
      case 'distrust':
        return <AlertCircle size={size} className={cn("text-orange-500", className)} />;
      case 'greed':
        return <Heart size={size} className={cn("text-purple-500", className)} />;
      case 'fix':
        return <Check size={size} className={cn("text-blue-500", className)} />;
      case 'mental':
        return <Brain size={size} className={cn("text-indigo-500", className)} />;
      case 'energy':
        return <Zap size={size} className={cn("text-yellow-500", className)} />;
      default:
        return <Activity size={size} className={cn("text-gray-400", className)} />;
    }
  };

  return (
    <div className={animated ? "transition-all duration-200 hover:scale-110" : ""}>
      {getIcon()}
    </div>
  );
};

export default EmotionIcon;
