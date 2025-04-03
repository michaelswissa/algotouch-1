
import { supabase } from '@/integrations/supabase/client';
import { CourseProgress } from './types';

/**
 * Get user's course progress
 */
export async function getUserCourseProgress(
  userId: string,
  courseId?: string
): Promise<CourseProgress[]> {
  try {
    if (!userId) return [];
    
    let query = supabase
      .from('course_progress')
      .select('*')
      .eq('user_id', userId);
    
    if (courseId) {
      query = query.eq('course_id', courseId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching course progress:', error);
      return [];
    }
    
    // Transform the data to match our CourseProgress type
    const progressData = data.map(item => ({
      courseId: item.course_id,
      userId: item.user_id,
      lessonsWatched: item.lessons_watched || [],
      modulesCompleted: item.modules_completed || [],
      isCompleted: item.is_completed,
      lastWatched: item.last_watched,
      created_at: item.created_at,
      updated_at: item.updated_at
    }));
    
    return progressData;
  } catch (error) {
    console.error('Error in getUserCourseProgress:', error);
    return [];
  }
}
