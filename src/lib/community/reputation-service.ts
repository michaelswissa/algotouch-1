
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { incrementColumnValue, rowExists } from './utils';

// Define activity types with their point values
export const ACTIVITY_TYPES = {
  DAILY_LOGIN: 'DAILY_LOGIN', // 2 points
  POST_CREATED: 'POST_CREATED', // 10 points
  POST_LIKED: 'POST_LIKED', // 1 point
  COMMENT_ADDED: 'COMMENT_ADDED', // 5 points
  LESSON_WATCHED: 'LESSON_WATCHED', // 5 points
  MODULE_COMPLETED: 'MODULE_COMPLETED', // 20 points
  COURSE_COMPLETED: 'COURSE_COMPLETED', // 50 points
  STREAK_MILESTONE: 'STREAK_MILESTONE' // Variable points
};

// Point values for each activity type
export const POINTS_MAP = {
  [ACTIVITY_TYPES.DAILY_LOGIN]: 2,
  [ACTIVITY_TYPES.POST_CREATED]: 10,
  [ACTIVITY_TYPES.POST_LIKED]: 1,
  [ACTIVITY_TYPES.COMMENT_ADDED]: 5,
  [ACTIVITY_TYPES.LESSON_WATCHED]: 5,
  [ACTIVITY_TYPES.MODULE_COMPLETED]: 20,
  [ACTIVITY_TYPES.COURSE_COMPLETED]: 50
};

/**
 * Initialize user reputation if not exists
 */
export async function initUserReputation(userId: string): Promise<void> {
  try {
    const exists = await rowExists('community_reputation', 'user_id', userId);
    
    if (!exists) {
      // Create initial reputation record
      await supabase.from('community_reputation').insert({
        user_id: userId,
        points: 0,
        level: 1
      });
    }
  } catch (error) {
    console.error('Error initializing user reputation:', error);
  }
}

/**
 * Get user reputation data
 */
export async function getUserReputation(userId: string) {
  try {
    // Initialize reputation if not exists
    await initUserReputation(userId);
    
    // Get reputation data
    const { data, error } = await supabase
      .from('community_reputation')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) {
      console.error('Error fetching user reputation:', error);
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUserReputation:', error);
    return null;
  }
}

/**
 * Get user reputation points
 */
export async function getUserReputationPoints(userId: string): Promise<number> {
  try {
    const reputation = await getUserReputation(userId);
    return reputation?.points || 0;
  } catch (error) {
    console.error('Error getting user reputation points:', error);
    return 0;
  }
}

/**
 * Award points to a user for a specific activity
 */
export async function awardPoints(
  userId: string, 
  activityType: string, 
  referenceId?: string
): Promise<boolean> {
  try {
    // Validate activity type
    if (!Object.values(ACTIVITY_TYPES).includes(activityType)) {
      console.error('Invalid activity type:', activityType);
      return false;
    }
    
    // Get points for activity type
    let points = POINTS_MAP[activityType as keyof typeof POINTS_MAP] || 0;
    
    // If activity type is not in POINTS_MAP, it might be a custom one like STREAK_MILESTONE
    if (points === 0 && activityType === ACTIVITY_TYPES.STREAK_MILESTONE) {
      // Default points for streak milestone
      points = 5; 
    }
    
    // Initialize user reputation if not exists
    await initUserReputation(userId);
    
    // Record the activity
    const { error: activityError } = await supabase
      .from('community_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        points_earned: points,
        reference_id: referenceId
      });
    
    if (activityError) {
      console.error('Error recording activity:', activityError);
      return false;
    }
    
    // Get user reputation record
    const { data: reputationData, error: repError } = await supabase
      .from('community_reputation')
      .select('id, points')
      .eq('user_id', userId)
      .single();
    
    if (repError) {
      console.error('Error fetching user reputation:', repError);
      return false;
    }
    
    // Update points using the incrementColumnValue utility function
    return await incrementColumnValue(
      reputationData.id,
      'community_reputation',
      'points',
      points
    );
  } catch (error) {
    console.error('Error in awardPoints:', error);
    return false;
  }
}
