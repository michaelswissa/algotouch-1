
import React from 'react';
import { useNavigate } from 'react-router-dom';
import CourseCard, { CourseProps } from './CourseCard';
import { coursesData } from '../data/courses';

interface CoursesComponentProps {
  onCourseClick?: (courseId: string) => void;
  selectedCourseId?: string | null;
}

const Courses = ({ onCourseClick, selectedCourseId }: CoursesComponentProps) => {
  const navigate = useNavigate();

  const handleCourseClick = (courseId: string) => {
    console.log("קורס נבחר:", courseId);
    if (onCourseClick) {
      onCourseClick(courseId);
    }
    navigate(`/courses/${courseId}`);
  };

  return (
    <div className="mt-8" dir="rtl">
      <h2 className="text-2xl font-bold mb-6">קורסים דיגיטליים</h2>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {coursesData.map((course, index) => (
          <CourseCard 
            key={index} 
            {...course} 
            onClick={() => course.id && handleCourseClick(course.id)}
            isSelected={course.id === selectedCourseId}
          />
        ))}
      </div>
    </div>
  );
};

// Export coursesData to maintain backward compatibility if needed
Courses.coursesData = coursesData;

export default Courses;
