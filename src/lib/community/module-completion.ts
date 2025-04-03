
import { supabase } from '@/integrations/supabase/client';
import { awardPoints, ACTIVITY_TYPES } from './reputation-service';

/**
 * Mark a module as completed and award points
 */
export async function completeModule(
  userId: string, 
  courseId: string, 
  moduleId: string
): Promise<boolean> {
  try {
    if (!userId) return false;
    
    // Get the course progress
    const { data: progress } = await supabase
      .from('course_progress')
      .select('id, modules_completed')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    if (!progress) {
      console.error('No course progress found');
      return false;
    }
    
    // Check if the module is already completed
    const modulesCompleted = progress.modules_completed || [];
    if (modulesCompleted.includes(moduleId)) {
      return false;
    }
    
    // Add the module to completed modules
    modulesCompleted.push(moduleId);
    
    // Update the progress
    await supabase
      .from('course_progress')
      .update({ modules_completed: modulesCompleted })
      .eq('id', progress.id);
    
    // Award points for completing a module
    await awardPoints(userId, ACTIVITY_TYPES.MODULE_COMPLETED, moduleId);
    
    return true;
  } catch (error) {
    console.error('Error completing module:', error);
    return false;
  }
}
