import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import CourseHeader from '@/components/courses/CourseHeader';
import CourseContentTabs from '@/components/courses/CourseContentTabs';
import CourseVideoPlayer from '@/components/courses/CourseVideoPlayer';
import Layout from '@/components/Layout';
import Courses from '@/components/Courses';
import { useVideoProgress } from '@/hooks/useVideoProgress';
import { recordLessonWatched } from '@/lib/community/course-service';
import { useAuth } from '@/features/auth'; // Updated import path

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('content');
  
  // Find the course data based on the ID from URL params
  const course = Courses.coursesData.find(course => course.id === courseId);

  // Sample lesson data (in a real app, this would come from an API)
  const lessons = [
    { 
      id: 1, 
      title: "מבוא למערכת AlgoTouch", 
      duration: "10:25",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" // Example YouTube URL
    },
    { 
      id: 2, 
      title: "פתיחת חשבון ב-TradeStation", 
      duration: "15:30",
      videoUrl: "https://www.youtube.com/embed/jNQXAC9IVRw" 
    },
    { 
      id: 3, 
      title: "הגדרת מערכת אלגוטאצ'", 
      duration: "12:15",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ"
    }
  ];
  
  // Initialize state for active video
  const [activeVideoId, setActiveVideoId] = useState<number | null>(1);
  const activeLesson = lessons.find(lesson => lesson.id === activeVideoId);

  // Track video progress
  const { videoCompleted, handleVideoProgress, handleVideoEnded } = useVideoProgress({
    courseId: courseId || '',
    lessonId: activeVideoId,
    recordLessonWatched: user ? recordLessonWatched.bind(null, user.id) : undefined,
    videoTitle: activeLesson?.title
  });

  // Function to handle lesson click
  const handleLessonClick = (lessonId: number) => {
    setActiveVideoId(lessonId);
  };
  
  if (!course) {
    return (
      <Layout>
        <div className="tradervue-container py-6">
          <div className="text-center p-10">
            <h1 className="text-2xl font-bold mb-4">קורס לא נמצא</h1>
            <p>הקורס המבוקש אינו קיים או שאין לך גישה אליו.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <CourseHeader 
          title={course.title} 
          description={course.description} 
          instructor="מדריך מקצועי"
          progress={25}
          isAuthenticated={!!user}
          hasCourseCompletionBadge={false}
        />
        
        {activeLesson && (
          <CourseVideoPlayer
            videoUrl={activeLesson.videoUrl || ''}
            videoTitle={activeLesson.title}
            duration={activeLesson.duration}
            onEnded={handleVideoEnded}
            onProgress={handleVideoProgress}
            completed={videoCompleted}
          />
        )}
        
        <CourseContentTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lessons={lessons}
          modules={course.modules}
          resources={[
            { id: 1, title: "מדריך למשתמש AlgoTouch", type: "PDF", size: "2.4 MB" },
            { id: 2, title: "רשימת פרמטרים מומלצים", type: "XLSX", size: "1.1 MB" }
          ]}
          activeVideoId={activeVideoId}
          watchedLessons={[]}
          completedModules={[]}
          onLessonClick={handleLessonClick}
        />
      </div>
    </Layout>
  );
};

export default CourseDetail;
