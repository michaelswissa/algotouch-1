
import { supabase } from '@/integrations/supabase/client';

/**
 * Mark a module as completed by the user
 */
export async function completeModule(courseId: string, moduleId: string): Promise<void> {
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
      const modulesCompleted = existingProgress.modules_completed || [];
      if (!modulesCompleted.includes(moduleId)) {
        modulesCompleted.push(moduleId);
        
        await supabase
          .from('course_progress')
          .update({
            modules_completed: modulesCompleted,
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
          lessons_watched: [],
          modules_completed: [moduleId],
          is_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
    }
    
    console.log(`Module ${moduleId} marked as completed for course ${courseId}`);
  } catch (error) {
    console.error('Error completing module:', error);
    throw error;
  }
}
