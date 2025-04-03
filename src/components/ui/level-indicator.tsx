
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface LevelIndicatorProps {
  level: number;
  points: number;
  className?: string;
}

export function LevelIndicator({ level, points, className }: LevelIndicatorProps) {
  // Calculate progress to next level (each level is 100 points)
  const basePoints = (level - 1) * 100;
  const nextLevelPoints = level * 100;
  const pointsToNextLevel = nextLevelPoints - basePoints;
  const currentLevelPoints = points - basePoints;
  const progressPercent = Math.min(100, Math.round((currentLevelPoints / pointsToNextLevel) * 100));
  
  const getLevelColor = (level: number) => {
    if (level < 3) return 'bg-blue-500 text-white';
    if (level < 5) return 'bg-green-500 text-white';
    if (level < 10) return 'bg-purple-500 text-white';
    return 'bg-amber-500 text-white';
  };
  
  return (
    <div className={cn("flex flex-col space-y-1", className)}>
      <div className="flex justify-between items-center">
        <Badge className={cn("font-semibold", getLevelColor(level))}>
          רמה {level}
        </Badge>
        <span className="text-xs text-muted-foreground">{currentLevelPoints} / {pointsToNextLevel} נקודות</span>
      </div>
      <Progress value={progressPercent} className="h-2" indicatorClassName={cn("transition-all", getLevelColor(level))} />
    </div>
  );
}
