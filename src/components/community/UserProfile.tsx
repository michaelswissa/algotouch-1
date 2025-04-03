
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LevelIndicator } from '@/components/ui/level-indicator';
import UserBadges from '@/components/community/UserBadges';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { Flame } from 'lucide-react';

interface UserProfileProps {
  user: {
    id: string;
    email?: string;
  } | null;
}

export function UserProfile({ user }: UserProfileProps) {
  const { userLevel, userPoints, userBadges, allBadges, userStreak } = useCommunity();
  
  if (!user) return null;
  
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <div className="flex items-center gap-4 mb-4">
          <Avatar className="h-12 w-12">
            <AvatarImage src={`https://avatar.vercel.sh/${user?.id || 'user'}?size=48`} />
            <AvatarFallback>{user?.email?.charAt(0) || 'U'}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-semibold">{user?.email}</h3>
            <LevelIndicator 
              level={userLevel} 
              points={userPoints} 
              className="mt-2 max-w-sm" 
            />
          </div>
          
          {userStreak && (
            <div className="flex flex-col items-center justify-center bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg">
              <div className="flex items-center gap-1">
                <Flame className="h-5 w-5 text-orange-500" />
                <span className="text-lg font-bold text-orange-700 dark:text-orange-400">{userStreak.currentStreak}</span>
              </div>
              <div className="text-xs text-orange-600 dark:text-orange-300">ימים רצופים</div>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">התגים שלך</h4>
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
