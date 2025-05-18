
import { supabase } from '@/integrations/supabase/client';

/**
 * Get user course progress
 */
export async function getUserCourseProgress(userId: string) {
  try {
    const { data, error } = await supabase
      .from('course_progress')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error fetching user course progress:', error);
    return [];
  }
}
