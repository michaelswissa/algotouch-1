
import { supabase } from '@/integrations/supabase/client';

/**
 * Record a lesson as watched by the user
 */
export async function recordLessonWatched(userId: string, courseId: string): Promise<boolean> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user?.user?.id) {
      throw new Error('User not authenticated');
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
      const lessonsWatched = existingProgress.lessons_watched || [];
      if (!lessonsWatched.includes(userId)) {
        lessonsWatched.push(userId);
        
        await supabase
          .from('course_progress')
          .update({
            lessons_watched: lessonsWatched,
            last_watched: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
      }
    } else {
      // Create new progress entry
      await supabase
        .from('course_progress')
        .insert({
          user_id: user.user.id,
          course_id: courseId,
          lessons_watched: [userId],
          modules_completed: [],
          is_completed: false,
          last_watched: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    console.log(`Lesson ${userId} recorded as watched for course ${courseId}`);
    return true;
  } catch (error) {
    console.error('Error recording lesson watched:', error);
    return false;
  }
}
