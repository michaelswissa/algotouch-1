
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ACTIVITY_TYPES, getUserReputation, awardPoints } from '@/lib/community';

export function useReputationActions(userId: string | undefined) {
  const [userPoints, setUserPoints] = useState(0);
  const [userLevel, setUserLevel] = useState(1);

  // Function to check and award daily login points
  const checkAndAwardDailyLogin = async () => {
    if (!userId) return;
    
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Check if user already got points today
      const { data } = await supabase
        .from('community_activities')
        .select('created_at')
        .eq('user_id', userId)
        .eq('activity_type', ACTIVITY_TYPES.DAILY_LOGIN)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .maybeSingle();
      
      if (!data) {
        // Award points for daily login
        const success = await awardPoints(userId, ACTIVITY_TYPES.DAILY_LOGIN);
        if (success) {
          toast.success('קיבלת 2 נקודות על כניסה יומית!', {
            duration: 3000,
          });
          
          // Check for streak milestones and award bonus points
          await checkStreakMilestones(userId);
          
          // Update user points after awarding
          const reputation = await getUserReputation(userId);
          if (reputation) {
            setUserPoints(reputation.points);
            setUserLevel(reputation.level);
          }
        }
      }
    } catch (error) {
      console.error('Error checking daily login:', error);
    }
  };

  // Check for streak milestones and award bonus points
  const checkStreakMilestones = async (userId: string) => {
    try {
      // Get current streak data
      const { data: streakData } = await supabase
        .from('user_streaks')
        .select('current_streak')
        .eq('user_id', userId)
        .single();
      
      if (!streakData) return;
      
      const { current_streak } = streakData;
      
      // Milestone bonus points
      if (current_streak === 3) {
        // 3-day streak milestone
        await awardBonusPoints(userId, 5, '3 ימים רצופים');
      } else if (current_streak === 7) {
        // 7-day streak milestone
        await awardBonusPoints(userId, 15, 'שבוע מלא');
      } else if (current_streak === 14) {
        // 14-day streak milestone
        await awardBonusPoints(userId, 30, 'שבועיים רצופים');
      } else if (current_streak === 30) {
        // 30-day streak milestone
        await awardBonusPoints(userId, 100, 'חודש מלא');
      } else if (current_streak % 30 === 0 && current_streak > 30) {
        // Every additional 30 days
        await awardBonusPoints(userId, 100, `${current_streak} ימים רצופים`);
      }
    } catch (error) {
      console.error('Error checking streak milestones:', error);
    }
  };

  // Award bonus points for streaks
  const awardBonusPoints = async (userId: string, points: number, milestone: string) => {
    try {
      // Create a custom activity type for the record
      const { data, error } = await supabase
        .from('community_activities')
        .insert({
          user_id: userId,
          activity_type: 'STREAK_MILESTONE',
          points_earned: points,
          metadata: { milestone }
        });
      
      if (error) {
        console.error('Error recording streak milestone:', error);
        return;
      }
      
      // Update user's points directly
      try {
        const { error } = await supabase.rpc('increment_user_points', {
          user_id_param: userId,
          points_to_add: points
        });
        
        if (error) throw error;
      } catch (rpcError) {
        console.warn('RPC failed, using fallback method:', rpcError);
        
        // Fallback method
        const { data: currentRep } = await supabase
          .from('community_reputation')
          .select('points')
          .eq('user_id', userId)
          .single();
          
        if (currentRep) {
          await supabase
            .from('community_reputation')
            .update({ 
              points: currentRep.points + points, 
              updated_at: new Date().toISOString() 
            })
            .eq('user_id', userId);
        }
      }
      
      // Show toast notification
      toast.success(`ציון דרך חדש: ${milestone}! קיבלת ${points} נקודות בונוס!`, {
        duration: 5000,
      });
    } catch (error) {
      console.error('Error awarding bonus points:', error);
    }
  };

  const updateReputationData = async () => {
    if (!userId) return;
    
    const reputation = await getUserReputation(userId);
    if (reputation) {
      setUserPoints(reputation.points);
      setUserLevel(reputation.level);
    }
  };

  return {
    userPoints,
    userLevel,
    setUserPoints,
    setUserLevel,
    checkAndAwardDailyLogin,
    updateReputationData
  };
}
