
import { supabase } from '@/integrations/supabase/client';
import { Badge, UserBadge } from './types';

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
    
    return (data as UserBadge[]) || [];
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
    
    return (data as Badge[]) || [];
  } catch (error) {
    console.error('Exception in getAllBadges:', error);
    return [];
  }
}
