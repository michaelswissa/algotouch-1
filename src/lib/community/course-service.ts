
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
