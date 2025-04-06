
import { supabase } from '@/integrations/supabase/client';
import { ReputationData, ActivityType, ACTIVITY_TYPES } from './types';

/**
 * Initialize user reputation if they don't have it yet
 */
export async function initUserReputation(userId: string): Promise<ReputationData | null> {
  try {
    if (!userId) return null;
    
    // Check if user already has reputation
    const { data: existingRep, error: fetchError } = await supabase
      .from('community_reputation')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching reputation:', fetchError);
      return null;
    }
    
    if (existingRep) {
      return {
        points: existingRep.points,
        level: existingRep.level,
        userId: existingRep.user_id
      };
    }
    
    // Create new reputation entry
    const { data, error } = await supabase
      .from('community_reputation')
      .insert({ user_id: userId, points: 0, level: 1 })
      .select()
      .single();
    
    if (error) {
      console.error('Error initializing reputation:', error);
      return null;
    }
    
    return {
      points: data.points,
      level: data.level,
      userId: data.user_id
    };
  } catch (error) {
    console.error('Exception in initUserReputation:', error);
    return null;
  }
}

/**
 * Award points to user for completing an activity
 */
export async function awardPoints(
  userId: string, 
  activityType: ActivityType, 
  referenceId?: string
): Promise<boolean> {
  try {
    if (!userId) {
      console.error('Cannot award points: No user ID provided');
      return false;
    }
    
    const { ACTIVITY_POINTS } = await import('./types');
    const pointsToAward = ACTIVITY_POINTS[activityType] || 0;
    
    // First ensure user has a reputation record
    await initUserReputation(userId);
    
    // Record the activity
    const { error: activityError } = await supabase
      .from('community_activities')
      .insert({
        user_id: userId,
        activity_type: activityType.toString(),
        points_earned: pointsToAward,
        reference_id: referenceId || null
      });
      
    if (activityError) {
      console.error('Error recording activity:', activityError);
      return false;
    }
    
    // Update user's points directly
    try {
      // Try direct RPC call first if available
      const { error } = await supabase.rpc('increment_user_points', {
        user_id_param: userId,
        points_to_add: pointsToAward
      });
      
      if (error) {
        throw error;
      }
    } catch (rpcError) {
      console.warn('RPC failed, using fallback method:', rpcError);
      
      // Fallback method: get current points and update
      const { data: currentRep } = await supabase
        .from('community_reputation')
        .select('points')
        .eq('user_id', userId)
        .single();
        
      if (currentRep) {
        const { error } = await supabase
          .from('community_reputation')
          .update({ 
            points: currentRep.points + pointsToAward, 
            updated_at: new Date().toISOString() 
          })
          .eq('user_id', userId);
          
        if (error) {
          console.error('Error updating points:', error);
          return false;
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('Exception in awardPoints:', error);
    return false;
  }
}

/**
 * Get user's reputation data
 */
export async function getUserReputation(userId: string): Promise<ReputationData | null> {
  try {
    if (!userId) return null;
    
    const { data, error } = await supabase
      .from('community_reputation')
      .select('points, level, user_id')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (error) {
      console.error('Error fetching reputation:', error);
      return null;
    }
    
    if (!data) {
      // Initialize reputation if not found
      return initUserReputation(userId);
    }
    
    return {
      points: data.points,
      level: data.level,
      userId: data.user_id
    };
  } catch (error) {
    console.error('Exception in getUserReputation:', error);
    return null;
  }
}

/**
 * Get user's reputation points (a simpler function for just getting points)
 */
export async function getUserReputationPoints(userId: string): Promise<number> {
  try {
    const reputation = await getUserReputation(userId);
    return reputation ? reputation.points : 0;
  } catch (error) {
    console.error('Exception in getUserReputationPoints:', error);
    return 0;
  }
}

// Export the main functions
export { ACTIVITY_TYPES };
