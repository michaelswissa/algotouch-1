
import React from 'react';
import { useParams } from 'react-router-dom';
import CourseHeader from '@/components/courses/CourseHeader';
import CourseContentTabs from '@/components/courses/CourseContentTabs';
import Layout from '@/components/Layout';
import { coursesData } from '@/components/Courses';

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  
  // Find the course data based on the ID from URL params
  const course = coursesData.find(course => course.id === courseId);
  
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
          progress={0}
          isAuthenticated={true}
          hasCourseCompletionBadge={false}
        />
        <CourseContentTabs 
          activeTab="content"
          setActiveTab={() => {}}
          lessons={[]}
          modules={course.modules}
          resources={[]}
          activeVideoId={null}
          watchedLessons={[]}
          completedModules={[]}
          onLessonClick={() => {}}
        />
      </div>
    </Layout>
  );
};

export default CourseDetail;
