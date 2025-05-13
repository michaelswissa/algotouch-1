
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface UseVideoProgressProps {
  courseId: string;
  lessonId: number | null;
  recordLessonWatched?: (courseId: string, lessonId: string) => Promise<boolean>;
  videoTitle?: string;
}

export function useVideoProgress({
  courseId, 
  lessonId, 
  recordLessonWatched,
  videoTitle
}: UseVideoProgressProps) {
  const [watchedTime, setWatchedTime] = useState<number>(0);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [videoCompleted, setVideoCompleted] = useState<boolean>(false);
  
  // Track if video has been marked as watched to avoid duplicate points
  const videoMarkedAsWatched = useRef(false);
  
  // Threshold for considering video as watched (80%)
  const lessonCompletionThreshold = 0.8;
  
  // Reset watched time and completion status when video changes
  useEffect(() => {
    setWatchedTime(0);
    setVideoDuration(0);
    setVideoCompleted(false);
    videoMarkedAsWatched.current = false;
  }, [lessonId]);
  
  // Track video progress
  const handleVideoProgress = async (event: any) => {
    if (!lessonId) return;
    
    const currentTime = event.target?.currentTime || 0;
    const duration = event.target?.duration || 0;
    
    if (duration > 0) {
      setWatchedTime(currentTime);
      setVideoDuration(duration);
      const percentWatched = currentTime / duration;
      
      // If watched more than threshold and not already marked as watched
      if (percentWatched >= lessonCompletionThreshold && !videoMarkedAsWatched.current) {
        videoMarkedAsWatched.current = true;
        setVideoCompleted(true);
        
        // Award points for watching the lesson
        if (recordLessonWatched) {
          const lessonIdStr = lessonId.toString();
          await recordLessonWatched(courseId, lessonIdStr);
        }
      }
    }
  };
  
  // Handle video ended event
  const handleVideoEnded = async () => {
    if (!lessonId) return;
    
    if (!videoMarkedAsWatched.current && recordLessonWatched) {
      videoMarkedAsWatched.current = true;
      
      // Award points if not already awarded earlier by the progress handler
      if (!videoCompleted) {
        const lessonIdStr = lessonId.toString();
        await recordLessonWatched(courseId, lessonIdStr);
      }
      
      toast.success('השיעור הושלם!', {
        description: 'המשך לשיעור הבא כדי להמשיך ללמוד',
        duration: 3000,
      });
      
      setVideoCompleted(true);
    }
  };
  
  return {
    watchedTime,
    videoDuration,
    videoCompleted,
    progressPercentage: videoDuration > 0 ? (watchedTime / videoDuration) * 100 : 0,
    handleVideoProgress,
    handleVideoEnded
  };
}
