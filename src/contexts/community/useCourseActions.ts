
import { useState } from 'react';
import { toast } from 'sonner';
import { CourseProgress } from '@/lib/community';

export function useCourseActions(userId: string | undefined, refreshDataCallback: () => Promise<void>) {
  const [courseProgress, setCourseProgress] = useState<CourseProgress[]>([]);

  // Function to record a lesson watched
  const handleLessonWatched = async (courseId: string, lessonId: string) => {
    if (!userId) return false;

    try {
      // Import dynamically to avoid circular imports
      const { recordLessonWatched } = await import('@/lib/community/course-service');
      const result = await recordLessonWatched(userId, courseId, lessonId);
      
      if (result) {
        toast.success('קיבלת 5 נקודות על צפייה בשיעור!', {
          duration: 3000,
        });

        // Update user data
        await refreshDataCallback();
      }
      
      return result;
    } catch (error) {
      console.error('Error recording lesson watched:', error);
      return false;
    }
  };

  // Function to complete a module
  const handleModuleCompleted = async (courseId: string, moduleId: string) => {
    if (!userId) return false;
    
    try {
      // Import dynamically to avoid circular imports
      const { completeModule } = await import('@/lib/community/course-service');
      const result = await completeModule(userId, courseId, moduleId);
      
      if (result) {
        toast.success('מודול הושלם! קיבלת 20 נקודות!', {
          duration: 3000,
        });

        // Update user data
        await refreshDataCallback();
      }
      
      return result;
    } catch (error) {
      console.error('Error completing module:', error);
      return false;
    }
  };

  // Function to complete a course
  const handleCourseCompleted = async (courseId: string) => {
    if (!userId) return false;
    
    try {
      // Import dynamically to avoid circular imports
      const { completeCourse } = await import('@/lib/community/course-service');
      const result = await completeCourse(userId, courseId);
      
      if (result) {
        toast.success('קורס הושלם! קיבלת 50 נקודות ותעודה חדשה!', {
          duration: 4000,
        });

        // Update user data
        await refreshDataCallback();
      }
      
      return result;
    } catch (error) {
      console.error('Error completing course:', error);
      return false;
    }
  };

  return {
    courseProgress,
    setCourseProgress,
    recordLessonWatched: handleLessonWatched,
    completeModule: handleModuleCompleted,
    completeCourse: handleCourseCompleted
  };
}
