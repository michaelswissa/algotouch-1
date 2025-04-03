
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LevelIndicator } from '@/components/ui/level-indicator';
import UserBadges from '@/components/community/UserBadges';

interface UserProfileProps {
  user: {
    id: string;
    email?: string;
  } | null;
  userLevel: number;
  userPoints: number;
  userBadges: any[];
  allBadges: any[];
}

export function UserProfile({ user, userLevel, userPoints, userBadges, allBadges }: UserProfileProps) {
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
