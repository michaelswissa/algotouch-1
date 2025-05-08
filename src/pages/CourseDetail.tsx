
import React from 'react';
import { useParams } from 'react-router-dom';
import CourseHeader from '@/components/courses/CourseHeader';
import CourseContentTabs from '@/components/courses/CourseContentTabs';
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
    hasCourseCompletionBadge
  } = useCourseData(courseId);

  const watchedLessons = userProgress?.lessonsWatched || [];
  const completedModules = userProgress?.modulesCompleted || [];

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
