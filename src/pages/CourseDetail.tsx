
import React from 'react';
import { useParams } from 'react-router-dom';
import CourseDetail from '@/pages/CourseDetail';

// This component is imported in App.tsx as CourseDetail
const CourseDetailPage = () => {
  // Re-export the existing CourseDetail component
  return <CourseDetail />;
};

export default CourseDetailPage;
