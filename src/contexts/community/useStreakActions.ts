
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { UserStreak } from '@/lib/community';
import { toast } from 'sonner';
import { addDays, isSameDay, isAfter, differenceInDays } from 'date-fns';

export function useStreakActions(userId: string | undefined) {
  const [userStreak, setUserStreak] = useState<UserStreak | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to get user streak data
  const getUserStreak = useCallback(async () => {
    if (!userId) return null;
    
    try {
      setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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
      setIsLoading(true);
      const today = new Date();
      
      // Get current streak data
      const streak = await getUserStreak();
      if (!streak) return;
      
      // Check if already updated today
      const lastActivityDate = new Date(streak.lastActivity);
      if (isSameDay(lastActivityDate, today)) {
        return; // Already updated today
      }
      
      // Check if streak is broken (more than 1 day since last activity)
      const expectedNextDay = addDays(lastActivityDate, 1);
      const isStreakBroken = isAfter(today, addDays(expectedNextDay, 1));
      
      let updatedStreak;
      
      if (!isStreakBroken) {
        // Streak continues
        const newCurrentStreak = streak.currentStreak + 1;
        const newLongestStreak = Math.max(newCurrentStreak, streak.longestStreak);
        
        updatedStreak = {
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_activity: today.toISOString()
        };
        
        if (newCurrentStreak > streak.currentStreak) {
          // Only show toast if the streak actually increased
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
      
      // Refresh the streak data
      await getUserStreak();
    } catch (error) {
      console.error('Exception in updateUserStreak:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize streak on component mount
  useEffect(() => {
    if (userId) {
      getUserStreak();
    }
  }, [userId, getUserStreak]);

  return {
    userStreak,
    isLoading,
    getUserStreak,
    updateUserStreak
  };
}
