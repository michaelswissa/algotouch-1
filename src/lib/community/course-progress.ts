
import { supabase } from '@/integrations/supabase/client';
import { awardPoints, ACTIVITY_TYPES } from './reputation-service';
import { CourseProgress } from './types';

/**
 * Record that a user has watched a lesson and award points
 */
export async function recordLessonWatched(
  userId: string, 
  courseId: string, 
  lessonId: string
): Promise<boolean> {
  try {
    if (!userId) return false;
    
    // First, check if the user already has a course progress record
    const { data: existingProgress } = await supabase
      .from('course_progress')
      .select('id, lessons_watched')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    let lessonsWatched: string[] = [];
    
    if (existingProgress) {
      // If progress exists, update it
      lessonsWatched = existingProgress.lessons_watched || [];
      
      // Only award points if this is the first time watching this lesson
      if (!lessonsWatched.includes(lessonId)) {
        // Add the new lesson to the list
        lessonsWatched.push(lessonId);
        
        // Update the progress record
        await supabase
          .from('course_progress')
          .update({ 
            lessons_watched: lessonsWatched,
            last_watched: new Date().toISOString()
          })
          .eq('id', existingProgress.id);
        
        // Award points for watching a lesson
        await awardPoints(userId, ACTIVITY_TYPES.LESSON_WATCHED, lessonId);
        return true;
      }
      
      return false;
    } else {
      // If no progress record exists, create one
      lessonsWatched = [lessonId];
      
      await supabase
        .from('course_progress')
        .insert({
          user_id: userId,
          course_id: courseId,
          lessons_watched: lessonsWatched,
          modules_completed: [],
          is_completed: false,
          last_watched: new Date().toISOString()
        });
      
      // Award points for watching a lesson
      await awardPoints(userId, ACTIVITY_TYPES.LESSON_WATCHED, lessonId);
      return true;
    }
  } catch (error) {
    console.error('Error recording lesson watched:', error);
    return false;
  }
}
