
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Medal, Trophy, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface LeaderboardUser {
  user_id: string;
  points: number;
  level: number;
  first_name: string | null;
  last_name: string | null;
}

export function CommunityLeaderboard() {
  const [leaders, setLeaders] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        setIsLoading(true);
        // First get the reputation data
        const { data: repData, error: repError } = await supabase
          .from('community_reputation')
          .select('user_id, points, level')
          .order('points', { ascending: false })
          .limit(5);

        if (repError) {
          console.error('Error fetching leaderboard:', repError);
          toast({
            variant: "destructive",
            title: "שגיאה בטעינת מובילי הקהילה",
            description: "אירעה שגיאה בטעינת נתוני המובילים. נסה שוב מאוחר יותר."
          });
          return;
        }

        if (!repData || repData.length === 0) {
          setLeaders([]);
          return;
        }

        // Now fetch profile data for these users
        const userIds = repData.map(user => user.user_id);
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name')
          .in('id', userIds);

        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
        }

        // Combine the data
        const formattedData = repData.map(repItem => {
          const profile = profilesData?.find(p => p.id === repItem.user_id) || { 
            first_name: null, 
            last_name: null 
          };
          
          return {
            user_id: repItem.user_id,
            points: repItem.points,
            level: repItem.level,
            first_name: profile.first_name,
            last_name: profile.last_name
          };
        });

        setLeaders(formattedData);
      } catch (error) {
        console.error('Exception in fetchLeaderboard:', error);
        toast({
          variant: "destructive",
          title: "שגיאה בטעינת מובילי הקהילה",
          description: "אירעה שגיאה לא צפויה. נסה שוב מאוחר יותר."
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, [toast]);

  // Helper to get rank icon/styling
  const getRankElement = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-amber-700" />;
      default:
        return <span className="flex h-5 w-5 items-center justify-center text-xs font-medium">{index + 1}</span>;
    }
  };

  const getNameDisplay = (user: LeaderboardUser) => {
    if (user.first_name || user.last_name) {
      return `${user.first_name || ''} ${user.last_name || ''}`.trim();
    }
    return `סוחר ${user.user_id.substring(0, 4)}`;
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span>המובילים בקהילה</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-16 mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            אין מובילים עדיין. היה הראשון!
          </div>
        ) : (
          <div className="space-y-4">
            {leaders.map((user, index) => (
              <div key={user.user_id} className="flex items-center gap-3">
                <div className="flex items-center justify-center h-8 w-8">
                  {getRankElement(index)}
                </div>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={`https://avatar.vercel.sh/${user.user_id}?size=32`} />
                  <AvatarFallback>{getNameDisplay(user).charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-sm">{getNameDisplay(user)}</p>
                    <Badge variant="outline" className="text-xs">רמה {user.level}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">
                    {user.points} נקודות
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
