
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
