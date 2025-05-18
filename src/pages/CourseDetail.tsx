
import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import CourseHeader from '@/components/courses/CourseHeader';
import CourseContentTabs from '@/components/courses/CourseContentTabs';
import { coursesData } from '@/data/courses'; // Import directly from data source

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [activeTab, setActiveTab] = useState('content');
  const [activeVideoId, setActiveVideoId] = useState<number | null>(1);
  
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

  const handleLessonClick = (lessonId: number) => {
    setActiveVideoId(lessonId);
  };

  // Mock data for demonstration
  const sampleLessons = [
    { id: 1, title: 'מבוא לאלגוריתם מסחר', duration: '12:30', completed: true },
    { id: 2, title: 'יצירת אסטרטגיה בסיסית', duration: '15:45' },
    { id: 3, title: 'ניתוח נתונים היסטוריים', duration: '20:10' }
  ];
  
  const sampleResources = [
    { id: 1, title: 'מסמך אסטרטגיות מסחר', type: 'PDF', size: '2.4MB' },
    { id: 2, title: 'גיליון אקסל לחישובי ביצועים', type: 'XLSX', size: '1.8MB' }
  ];

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <CourseHeader 
          title={course.title} 
          description={course.description || ''} 
          instructor="מדריך מקצועי"
          progress={30}
          isAuthenticated={true}
          hasCourseCompletionBadge={false}
        />
        
        <CourseContentTabs 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          lessons={sampleLessons}
          modules={course.modules || []}
          resources={sampleResources}
          activeVideoId={activeVideoId}
          watchedLessons={['1']}
          completedModules={[]}
          onLessonClick={handleLessonClick}
        />
      </div>
    </Layout>
  );
};

export default CourseDetail;
