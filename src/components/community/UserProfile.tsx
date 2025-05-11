
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LevelIndicator } from '@/components/ui/level-indicator';
import UserBadges from '@/components/community/UserBadges';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { Flame, Trophy, Award, BadgeCheck, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { he } from 'date-fns/locale';

interface UserProfileProps {
  user: {
    id: string;
    email?: string;
  } | null;
}

// Helper component to render the user's level badge
const UserLevelBadge = ({ level }: { level: number }) => {
  const getBadgeColor = (level: number) => {
    if (level < 3) return 'bg-blue-500 hover:bg-blue-600';
    if (level < 5) return 'bg-green-500 hover:bg-green-600';
    if (level < 10) return 'bg-purple-500 hover:bg-purple-600';
    return 'bg-amber-500 hover:bg-amber-600';
  };

  const getBadgeIcon = (level: number) => {
    if (level < 3) return <Award className="h-3.5 w-3.5 mr-1" />;
    if (level < 5) return <BadgeCheck className="h-3.5 w-3.5 mr-1" />;
    if (level < 10) return <Trophy className="h-3.5 w-3.5 mr-1" />;
    return <Trophy className="h-3.5 w-3.5 mr-1" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge className={cn("ml-2 text-white", getBadgeColor(level))}>
          <span className="flex items-center">
            {getBadgeIcon(level)}
            <span>רמה {level}</span>
          </span>
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>השגת רמה {level} בזכות פעילותך בקהילה</p>
      </TooltipContent>
    </Tooltip>
  );
};

// Helper component to display the user's streak
const UserStreakDisplay = ({ streak }: { streak: { currentStreak: number; lastActivity: string } | null }) => {
  if (!streak) return null;
  
  const lastActivityDate = new Date(streak.lastActivity);
  const timeAgo = formatDistanceToNow(lastActivityDate, { locale: he, addSuffix: true });
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-center justify-center bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
          <div className="flex items-center gap-1">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-lg font-bold text-orange-700 dark:text-orange-400">{streak.currentStreak}</span>
          </div>
          <div className="text-xs text-orange-600 dark:text-orange-300">ימים רצופים</div>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p>פעילות אחרונה: {timeAgo}</p>
          <p className="text-xs">שמור על הרצף שלך בעזרת התחברות יומית!</p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
};

// Main UserProfile component
export function UserProfile({ user }: UserProfileProps) {
  const { userLevel, userPoints, userBadges, allBadges, userStreak } = useCommunity();
  
  if (!user) return null;
  
  const formattedStreak = userStreak ? {
    currentStreak: userStreak.currentStreak,
    lastActivity: userStreak.lastActivity
  } : null;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`https://avatar.vercel.sh/${user?.id || 'user'}?size=48`} />
            <AvatarFallback>{user?.email?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="flex items-center">
              <h3 className="font-semibold">{user?.email}</h3>
              <UserLevelBadge level={userLevel} />
            </div>
            <LevelIndicator 
              level={userLevel} 
              points={userPoints} 
              className="mt-2 max-w-sm" 
            />
          </div>
          
          {formattedStreak && <UserStreakDisplay streak={formattedStreak} />}
        </div>
        
        <div className="mt-4">
          <div className="flex items-center mb-2">
            <Award className="h-4 w-4 mr-1 text-primary" />
            <h4 className="text-sm font-medium">התגים שלך</h4>
          </div>
          <UserBadges 
            earnedBadges={userBadges} 
            allBadges={allBadges}
            showLocked={true}
          />
        </div>
      </CardContent>
    </Card>
  );
}
