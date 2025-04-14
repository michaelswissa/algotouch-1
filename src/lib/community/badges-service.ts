
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
        badge_id,
        badge:community_badges(
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
    
    // Transform the data to match our UserBadge type
    const formattedData = data?.map(item => {
      return {
        id: item.id,
        earned_at: item.earned_at,
        badge: item.badge as Badge // Fix: item.badge is already a Badge object, not an array
      } as UserBadge;
    }) || [];
    
    return formattedData;
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
    
    // The correct way to handle this type conversion
    return data as Badge[] || [];
  } catch (error) {
    console.error('Exception in getAllBadges:', error);
    return [];
  }
}
