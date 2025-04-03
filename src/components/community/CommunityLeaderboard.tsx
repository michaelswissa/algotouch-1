
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Medal, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';

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

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const { data, error } = await supabase
          .from('community_reputation')
          .select(`
            user_id,
            points,
            level,
            profiles:user_id (
              first_name,
              last_name
            )
          `)
          .order('points', { ascending: false })
          .limit(5);

        if (error) {
          console.error('Error fetching leaderboard:', error);
          return;
        }

        // Format the data to flatten the profiles
        const formattedData = data.map(item => ({
          user_id: item.user_id,
          points: item.points,
          level: item.level,
          first_name: item.profiles?.first_name || null,
          last_name: item.profiles?.last_name || null
        }));

        setLeaders(formattedData);
      } catch (error) {
        console.error('Exception in fetchLeaderboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

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
      <CardHeader>
        <CardTitle className="text-base">המובילים בקהילה</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-16 bg-gray-100 rounded mt-1"></div>
                </div>
              </div>
            ))}
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
