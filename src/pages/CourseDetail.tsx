
import React from 'react';
import { useParams } from 'react-router-dom';
import CourseHeader from '@/components/courses/CourseHeader';
import CourseContentTabs from '@/components/courses/CourseContentTabs';
import CourseVideoPlayer from '@/components/courses/CourseVideoPlayer';
import { Card } from '@/components/ui/card';
import { useCourseData } from '@/hooks/useCourseData';

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { 
    courseData, 
    activeTab, 
    setActiveTab, 
    activeVideoId, 
    userProgress, 
    handleLessonClick,
    progressPercentage,
    hasCourseCompletionBadge,
    handleVideoEnded,
    handleVideoProgress
  } = useCourseData(courseId);

  const watchedLessons = userProgress?.lessonsWatched || [];
  const completedModules = userProgress?.modulesCompleted || [];
  
  // Find the active lesson to display in the video player
  const activeLesson = courseData.lessons?.find(lesson => lesson.id === activeVideoId);

  return (
    <div className="space-y-6">
      <CourseHeader 
        title={courseData.title} 
        description={courseData.description} 
        instructor={courseData.instructor} 
        progress={progressPercentage} 
        isAuthenticated={true} 
        hasCourseCompletionBadge={!!hasCourseCompletionBadge()}
      />
      
      {/* Video Player - Add this back */}
      {activeLesson && (
        <CourseVideoPlayer 
          videoUrl={activeLesson.videoUrl}
          videoTitle={activeLesson.title}
          duration={activeLesson.duration}
          onEnded={handleVideoEnded}
          onProgress={handleVideoProgress}
          completed={watchedLessons.includes(activeLesson.id)}
        />
      )}
      
      <Card className="overflow-hidden">
        <CourseContentTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lessons={courseData.lessons}
          modules={courseData.modules}
          resources={courseData.resources}
          quizzes={courseData.quizzes}
          activeVideoId={activeVideoId}
          watchedLessons={watchedLessons}
          completedModules={completedModules}
          onLessonClick={handleLessonClick}
        />
      </Card>
    </div>
  );
};

export default CourseDetail;
