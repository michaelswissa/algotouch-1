
import React from 'react';
import { useParams } from 'react-router-dom';
import CourseHeader from '@/components/courses/CourseHeader';
import CourseContentTabs from '@/components/courses/CourseContentTabs';
import { Card } from '@/components/ui/card';

const CourseDetail = () => {
  const { courseId } = useParams<{ courseId: string }>();

  return (
    <div className="space-y-6">
      <CourseHeader courseId={courseId} />
      
      <Card className="overflow-hidden">
        <CourseContentTabs courseId={courseId} />
      </Card>
    </div>
  );
};

export default CourseDetail;
