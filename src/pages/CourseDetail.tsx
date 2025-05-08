
import React from 'react';
import Layout from '@/components/Layout';
import { CommunityProvider } from '@/contexts/community/CommunityContext';
import { useParams } from 'react-router-dom';
import { useCourseData } from '@/hooks/useCourseData';
import { LoadingPage } from '@/components/ui/spinner';

// Import course components
import CourseHeader from '@/components/courses/CourseHeader';
import CourseVideoPlayer from '@/components/courses/CourseVideoPlayer';
import CourseContentTabs from '@/components/courses/CourseContentTabs';
import { useAuth } from '@/contexts/auth';

const CourseDetailContent = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { isAuthenticated } = useAuth();
  
  const {
    courseData,
    activeTab,
    setActiveTab,
    videoUrl,
    videoTitle,
    activeLesson,
    progressPercentage,
    userProgress,
    activeVideoId,
    handleLessonClick,
    handleVideoProgress,
    handleVideoEnded,
    hasCourseCompletionBadge,
    videoCompleted
  } = useCourseData(courseId);

  if (!courseData) {
    return <LoadingPage message="טוען את הקורס..." />;
  }

  return (
    <Layout className="p-4 md:p-6">
      <CourseHeader 
        title={courseData.title}
        description={courseData.description}
        instructor={courseData.instructor}
        progress={progressPercentage}
        isAuthenticated={isAuthenticated}
        hasCourseCompletionBadge={hasCourseCompletionBadge()}
      />
      
      <CourseVideoPlayer 
        videoUrl={videoUrl}
        videoTitle={videoTitle}
        duration={activeLesson?.duration || courseData.activeVideo?.duration}
        onEnded={handleVideoEnded}
        onProgress={handleVideoProgress}
        completed={videoCompleted}
      />
      
      <CourseContentTabs 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lessons={courseData.lessons}
        modules={courseData.modules}
        resources={courseData.resources}
        quizzes={courseData.quizzes}
        activeVideoId={activeVideoId}
        watchedLessons={userProgress?.lessonsWatched || []}
        completedModules={userProgress?.modulesCompleted || []}
        onLessonClick={handleLessonClick}
      />
    </Layout>
  );
};

const CourseDetail = () => {
  return (
    <CommunityProvider>
      <CourseDetailContent />
    </CommunityProvider>
  );
};

export default CourseDetail;
