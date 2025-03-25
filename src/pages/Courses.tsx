
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Courses from '@/components/Courses';

const CoursesPage = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  // Function to log which course was selected
  const handleCourseClick = (courseId: string) => {
    console.log("קורס נבחר:", courseId);
    setSelectedCourseId(courseId);
  };

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">קורסים</h1>
        
        <Courses onCourseClick={handleCourseClick} selectedCourseId={selectedCourseId} />
      </div>
    </Layout>
  );
};

export default CoursesPage;
