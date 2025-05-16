import React, { Suspense, useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Spinner } from '@/components/ui/spinner';
import { PageTitle } from '@/components/ui/page-title';
import { CourseCard } from '@/components/CourseCard';

// Course data
const courseData = [
  {
    id: '1',
    title: 'קורס מסחר יומי',
    description: 'למד את הטכניקות המתקדמות ביותר למסחר יומי.',
    imageUrl: '/images/course1.jpg',
    price: 299,
  },
  {
    id: '2',
    title: 'ניתוח טכני מתקדם',
    description: 'הבן את הגרפים וקבל החלטות מסחר חכמות יותר.',
    imageUrl: '/images/course2.jpg',
    price: 199,
  },
  {
    id: '3',
    title: 'ניהול סיכונים במסחר',
    description: 'הגן על ההשקעות שלך ולמד לנהל סיכונים בצורה יעילה.',
    imageUrl: '/images/course3.jpg',
    price: 99,
  },
];

export default function Courses() {
  const [loading, setLoading] = useState(false);

  return (
    <div className="container py-8">
      <PageTitle>הקורסים שלנו</PageTitle>
      <ErrorBoundary fallback={<p>אירעה שגיאה בטעינת הקורסים.</p>}>
        <Suspense fallback={<div className="text-center"><Spinner /></div>}>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courseData.map((course) => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
