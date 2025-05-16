
import React, { Suspense, useState } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Spinner } from '@/components/ui/spinner';
import { PageTitle } from '@/components/ui/page-title';
import CourseCard from '@/components/CourseCard';

// Course data - make this available to other components via a named export
export const coursesData = [
  {
    id: '1',
    title: 'קורס מסחר יומי',
    description: 'למד את הטכניקות המתקדמות ביותר למסחר יומי.',
    imageUrl: '/images/course1.jpg',
    price: 299,
    modules: [
      {
        title: 'מבוא למסחר יומי',
        duration: '45 דקות',
        isNew: true
      },
      {
        title: 'אסטרטגיות סווינג טרייד',
        duration: '60 דקות'
      },
      {
        title: 'ניהול סיכונים במסחר יומי',
        duration: '35 דקות'
      },
      {
        title: 'אינדיקטורים טכניים',
        duration: '55 דקות'
      }
    ]
  },
  {
    id: '2',
    title: 'ניתוח טכני מתקדם',
    description: 'הבן את הגרפים וקבל החלטות מסחר חכמות יותר.',
    imageUrl: '/images/course2.jpg',
    price: 199,
    modules: [
      {
        title: 'נרות יפניים מתקדמים',
        duration: '50 דקות'
      },
      {
        title: 'תבניות מסחר מתקדמות',
        duration: '65 דקות',
        isNew: true
      },
      {
        title: 'שימוש בפיבונאצ׳י וגלי אליוט',
        duration: '45 דקות'
      }
    ]
  },
  {
    id: '3',
    title: 'ניהול סיכונים במסחר',
    description: 'הגן על ההשקעות שלך ולמד לנהל סיכונים בצורה יעילה.',
    imageUrl: '/images/course3.jpg',
    price: 99,
    modules: [
      {
        title: 'בניית תוכנית ניהול סיכונים',
        duration: '30 דקות'
      },
      {
        title: 'גודל פוזיציה ומנופים',
        duration: '40 דקות'
      },
      {
        title: 'אסטרטגיות הגנה',
        duration: '35 דקות'
      }
    ]
  },
];

interface CoursesProps {
  onCourseClick?: (courseId: string) => void;
  selectedCourseId?: string | null;
}

export default function Courses({ onCourseClick, selectedCourseId }: CoursesProps) {
  const [loading, setLoading] = useState(false);

  // Default handler if none provided
  const handleCourseClick = (courseId: string) => {
    if (onCourseClick) {
      onCourseClick(courseId);
    } else {
      console.log(`Course clicked: ${courseId}`);
    }
  };

  return (
    <div className="container py-8">
      <PageTitle>הקורסים שלנו</PageTitle>
      <ErrorBoundary fallback={<p>אירעה שגיאה בטעינת הקורסים.</p>}>
        <Suspense fallback={<div className="text-center"><Spinner /></div>}>
          <div className="grid sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coursesData.map((course) => {
              const isSelected = selectedCourseId === course.id;
              return (
                <CourseCard 
                  key={course.id}
                  id={course.id}
                  title={course.title}
                  description={course.description}
                  icon="graduation"
                  modules={course.modules}
                  isSelected={isSelected}
                  onClick={() => handleCourseClick(course.id)}
                />
              );
            })}
          </div>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
