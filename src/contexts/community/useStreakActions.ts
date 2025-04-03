
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserStreak } from '@/lib/community';
import { toast } from 'sonner';

export function useStreakActions(userId: string | undefined) {
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);

  // Function to get user streak data
  const getUserStreak = async () => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('user_streaks')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user streak:', error);
        return null;
      }
      
      if (!data) {
        // Initialize streak if not found
        const initialStreak = await initializeUserStreak(userId);
        return initialStreak;
      }
      
      // Transform to our UserStreak type
      const streak: UserStreak = {
        userId: data.user_id,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastActivity: data.last_activity,
        streakStartDate: data.streak_start_date
      };
      
      setUserStreak(streak);
      return streak;
    } catch (error) {
      console.error('Exception in getUserStreak:', error);
      return null;
    }
  };

  // Function to initialize user streak
  const initializeUserStreak = async (userId: string): Promise<UserStreak | null> => {
    try {
      const today = new Date().toISOString();
      
      const newStreak = {
        user_id: userId,
        current_streak: 1,
        longest_streak: 1,
        last_activity: today,
        streak_start_date: today
      };
      
      const { data, error } = await supabase
        .from('user_streaks')
        .insert(newStreak)
        .select()
        .single();
      
      if (error) {
        console.error('Error initializing user streak:', error);
        return null;
      }
      
      // Transform to our UserStreak type
      const streak: UserStreak = {
        userId: data.user_id,
        currentStreak: data.current_streak,
        longestStreak: data.longest_streak,
        lastActivity: data.last_activity,
        streakStartDate: data.streak_start_date
      };
      
      setUserStreak(streak);
      return streak;
    } catch (error) {
      console.error('Exception in initializeUserStreak:', error);
      return null;
    }
  };

  // Function to update user streak
  const updateUserStreak = async () => {
    if (!userId) return;
    
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      
      // Get current streak data
      const streak = await getUserStreak();
      if (!streak) return;
      
      // Check if already updated today
      const lastActivityDate = new Date(streak.lastActivity).toISOString().split('T')[0];
      if (lastActivityDate === todayStr) {
        return; // Already updated today
      }
      
      // Check if streak is broken (more than 1 day since last activity)
      const lastActivity = new Date(streak.lastActivity);
      const daysSinceLastActivity = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
      
      let updatedStreak;
      
      if (daysSinceLastActivity <= 1) {
        // Streak continues
        const newCurrentStreak = streak.currentStreak + 1;
        const newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak);
        
        updatedStreak = {
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_activity: today.toISOString()
        };
        
        if (newCurrentStreak > streak.currentStreak) {
          toast.success(`שמרת על רצף של ${newCurrentStreak} ימים! המשך כך!`, {
            duration: 4000
          });
        }
      } else {
        // Streak broken, start new streak
        updatedStreak = {
          current_streak: 1,
          last_activity: today.toISOString(),
          streak_start_date: today.toISOString()
        };
        
        toast.info('התחלת רצף חדש! גלוש בכל יום כדי לשמור על הרצף.', {
          duration: 4000
        });
      }
      
      // Update in database
      const { error } = await supabase
        .from('user_streaks')
        .update(updatedStreak)
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error updating user streak:', error);
        return;
      }
      
      // Update local state
      getUserStreak();
    } catch (error) {
      console.error('Exception in updateUserStreak:', error);
    }
  };

  return {
    userStreak,
    getUserStreak,
    updateUserStreak
  };
}
