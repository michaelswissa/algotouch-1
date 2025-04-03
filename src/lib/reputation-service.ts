
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Activity types
export const ACTIVITY_TYPES = {
  NEW_POST: 'new_post',
  POST_LIKED: 'post_liked',
  COMMENT_ADDED: 'comment_added',
  DAILY_LOGIN: 'daily_login',
  PROFILE_COMPLETED: 'profile_completed',
};

// Points for each activity type
export const ACTIVITY_POINTS = {
  [ACTIVITY_TYPES.NEW_POST]: 10,
  [ACTIVITY_TYPES.POST_LIKED]: 5,
  [ACTIVITY_TYPES.COMMENT_ADDED]: 3,
  [ACTIVITY_TYPES.DAILY_LOGIN]: 2,
  [ACTIVITY_TYPES.PROFILE_COMPLETED]: 15,
};

// Interface for reputation data
export interface ReputationData {
  points: number;
  level: number;
  userId: string;
}

// Interface for badge data
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  points_required: number;
}

// Interface for user badges
export interface UserBadge {
  id: string;
  badge: Badge;
  earned_at: string;
}

/**
 * Initialize user reputation if they don't have it yet
 */
export async function initUserReputation(userId: string): Promise<ReputationData | null> {
  try {
    // Check if user already has reputation
    const { data: existingRep } = await supabase
      .from('community_reputation')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
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
  activityType: keyof typeof ACTIVITY_TYPES, 
  referenceId?: string
): Promise<boolean> {
  try {
    if (!userId) {
      console.error('Cannot award points: No user ID provided');
      return false;
    }
    
    const pointsToAward = ACTIVITY_POINTS[activityType] || 0;
    
    // First ensure user has a reputation record
    await initUserReputation(userId);
    
    // Record the activity
    const { error: activityError } = await supabase
      .from('community_activities')
      .insert({
        user_id: userId,
        activity_type: activityType,
        points_earned: pointsToAward,
        reference_id: referenceId || null
      });
      
    if (activityError) {
      console.error('Error recording activity:', activityError);
      return false;
    }
    
    // Update user's points
    const { error: updateError } = await supabase.rpc('increment_user_points', {
      user_id_param: userId,
      points_to_add: pointsToAward
    }).single();
    
    if (updateError) {
      // Fallback method if RPC doesn't exist yet
      const { data: currentRep } = await supabase
        .from('community_reputation')
        .select('points')
        .eq('user_id', userId)
        .single();
        
      if (currentRep) {
        const { error } = await supabase
          .from('community_reputation')
          .update({ points: currentRep.points + pointsToAward, updated_at: new Date().toISOString() })
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
 * Get user's badges
 */
export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  try {
    if (!userId) return [];
    
    const { data, error } = await supabase
      .from('user_badges')
      .select(`
        id,
        earned_at,
        badge:badge_id (
          id,
          name,
          description,
          icon,
          points_required
        )
      `)
      .eq('user_id', userId);
    
    if (error) {
      console.error('Error fetching user badges:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception in getUserBadges:', error);
    return [];
  }
}

/**
 * Get all available badges
 */
export async function getAllBadges(): Promise<Badge[]> {
  try {
    const { data, error } = await supabase
      .from('community_badges')
      .select('*')
      .order('points_required', { ascending: true });
    
    if (error) {
      console.error('Error fetching badges:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception in getAllBadges:', error);
    return [];
  }
}

/**
 * Register a post in the community
 */
export async function registerCommunityPost(
  userId: string,
  title: string,
  content: string
): Promise<string | null> {
  try {
    if (!userId || !title || !content) {
      toast.error('Missing required information for post');
      return null;
    }
    
    // Insert the post
    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        user_id: userId,
        title,
        content
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error creating post:', error);
      toast.error('שגיאה ביצירת הפוסט');
      return null;
    }
    
    // Award points for creating a post
    const postId = data.id;
    const success = await awardPoints(userId, ACTIVITY_TYPES.NEW_POST, postId);
    
    if (success) {
      toast.success('קיבלת 10 נקודות עבור פרסום פוסט חדש!', {
        duration: 3000,
      });
    }
    
    return postId;
  } catch (error) {
    console.error('Exception in registerCommunityPost:', error);
    toast.error('שגיאה בלתי צפויה בעת יצירת הפוסט');
    return null;
  }
}

/**
 * Like a post and award points to the post author
 */
export async function likePost(
  postId: string, 
  userId: string
): Promise<boolean> {
  try {
    // First get the post to identify the author
    const { data: post, error: postError } = await supabase
      .from('community_posts')
      .select('user_id, likes')
      .eq('id', postId)
      .single();
    
    if (postError) {
      console.error('Error fetching post:', postError);
      return false;
    }
    
    // Update the post likes count
    const { error: updateError } = await supabase
      .from('community_posts')
      .update({ likes: post.likes + 1 })
      .eq('id', postId);
    
    if (updateError) {
      console.error('Error updating likes:', updateError);
      return false;
    }
    
    // Award points to the post author (not to the person who liked)
    if (post.user_id && post.user_id !== userId) {
      await awardPoints(post.user_id, ACTIVITY_TYPES.POST_LIKED, postId);
    }
    
    return true;
  } catch (error) {
    console.error('Exception in likePost:', error);
    return false;
  }
}

/**
 * Get posts for the community page
 */
export async function getCommunityPosts() {
  try {
    const { data, error } = await supabase
      .from('community_posts')
      .select(`
        id,
        title,
        content,
        likes,
        comments,
        created_at,
        user_id,
        profiles:user_id (
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching posts:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Exception in getCommunityPosts:', error);
    return [];
  }
}
