
import { supabase } from '@/integrations/supabase/client';

/**
 * Mark a course as completed by the user
 */
export async function completeCourse(courseId: string): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      throw new Error('User not authenticated');
      return false;
    }
    
    // Check if course progress exists
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('*')
      .eq('user_id', user.user.id)
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (existingProgress) {
      // Update existing progress
      await supabase
        .from('course_progress')
        .update({
          is_completed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProgress.id);
      
      // Add a badge for completing the course
      await supabase
        .from('user_badges')
        .insert({
          user_id: user.user.id,
          badge_id: `course_completion_${courseId}`,
          earned_at: new Date().toISOString()
        });
    }
    
    console.log(`Course ${courseId} marked as completed`);
    return true;
  } catch (error) {
    console.error('Error completing course:', error);
    return false;
  }
}
