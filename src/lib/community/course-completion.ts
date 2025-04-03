
import { supabase } from '@/integrations/supabase/client';
import { awardPoints, ACTIVITY_TYPES } from './reputation-service';

/**
 * Mark a course as completed and award points & badge
 */
export async function completeCourse(
  userId: string, 
  courseId: string
): Promise<boolean> {
  try {
    if (!userId) return false;
    
    // Get the course progress
    const { data: progress } = await supabase
      .from('course_progress')
      .select('id, is_completed')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (!progress) {
      console.error('No course progress found');
      return false;
    }
    
    // Check if the course is already completed
    if (progress.is_completed) {
      return false;
    }
    
    // Mark the course as completed
    await supabase
      .from('course_progress')
      .update({ is_completed: true })
      .eq('id', progress.id);
    
    // Award points for completing the course
    await awardPoints(userId, ACTIVITY_TYPES.COURSE_COMPLETED, courseId);
    
    return true;
  } catch (error) {
    console.error('Error completing course:', error);
    return false;
  }
}
