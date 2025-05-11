
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Award } from 'lucide-react';

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

  const getProgressBarColor = (level: number) => {
    if (level < 3) return 'bg-blue-500';
    if (level < 5) return 'bg-green-500';
    if (level < 10) return 'bg-purple-500';
    return 'bg-amber-500';
  };
  
  return (
    <TooltipProvider>
      <div className={cn("flex flex-col space-y-1", className)}>
        <div className="flex justify-between items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge className={cn("font-semibold", getLevelColor(level))}>
                <span className="flex items-center gap-1">
                  <Award className="h-3 w-3" />
                  רמה {level}
                </span>
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1">
                <p>רמת הפעילות שלך בקהילה</p>
                <p className="text-xs text-muted-foreground">צבור נקודות בעזרת פעילות יומית</p>
              </div>
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-muted-foreground cursor-help">
                {currentLevelPoints} / {pointsToNextLevel} נקודות
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>נקודות לרמה הבאה: {pointsToNextLevel - currentLevelPoints}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">
              <Progress 
                value={progressPercent} 
                className="h-2" 
                indicatorClassName={cn("transition-all", getProgressBarColor(level))} 
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p>התקדמות לרמה {level + 1}</p>
              <p className="text-xs">{progressPercent}% הושלמו</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}
