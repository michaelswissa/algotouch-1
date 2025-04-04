
import React from 'react';
import { Award, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
}

export interface UserBadge {
  id: string;
  badge: Badge;
  earned_at: string;
}

interface UserBadgesProps {
  earnedBadges: UserBadge[];
  allBadges: Badge[];
  className?: string;
  showLocked?: boolean;
}

export default function UserBadges({ 
  earnedBadges, 
  allBadges, 
  className,
  showLocked = false 
}: UserBadgesProps) {
  // Map earned badges by ID for quick lookup
  const earnedBadgesMap = earnedBadges.reduce<Record<string, UserBadge>>((acc, badge) => {
    if (badge.badge) {
      acc[badge.badge.id] = badge;
    }
    return acc;
  }, {});
  
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, 'PP', { locale: he });
    } catch (error) {
      console.error('Error formatting date:', error, dateStr);
      return dateStr;
    }
  };
  
  // Get the correct icon component based on the badge icon string
  const getBadgeIcon = (iconName: string) => {
    // For now we're just using Award, but this can be expanded to support more icons
    return <Award className="w-8 h-8" />;
  };
  
  // Display badges
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      <TooltipProvider>
        {allBadges.map((badge) => {
          const isEarned = !!earnedBadgesMap[badge.id];
          
          // Skip locked badges if not showing them
          if (!isEarned && !showLocked) return null;
          
          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div 
                  className={cn(
                    "flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-all",
                    isEarned 
                      ? "bg-primary/10 hover:bg-primary/20 cursor-help" 
                      : "bg-gray-100 opacity-50 cursor-not-allowed"
                  )}
                >
                  <div className="relative">
                    {!isEarned && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Lock className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className={cn(
                      isEarned ? "text-primary" : "text-muted-foreground opacity-40"
                    )}>
                      {getBadgeIcon(badge.icon)}
                    </div>
                  </div>
                  <div className="text-xs mt-1 font-medium text-center line-clamp-1">
                    {badge.name}
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs">
                <div className="space-y-1">
                  <p className="font-semibold">{badge.name}</p>
                  <p className="text-sm">{badge.description}</p>
                  {isEarned && earnedBadgesMap[badge.id].earned_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      הושג ב-{formatDate(earnedBadgesMap[badge.id].earned_at)}
                    </p>
                  )}
                  {!isEarned && (
                    <p className="text-xs text-muted-foreground mt-1">
                      דרושות {badge.points_required} נקודות כדי לקבל תג זה
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </TooltipProvider>
    </div>
  );
}
