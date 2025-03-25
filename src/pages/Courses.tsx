
import React from 'react';
import Layout from '@/components/Layout';
import CourseCard from '@/components/CourseCard';

const CoursesPage = () => {
  const coursesData = [
    {
      title: "קורס אלגוטאצ' למתחילים",
      description: "לימוד שיטתי של מערכת אלגוטאצ' הכולל פתיחת חשבון, הגדרת המערכת, תפעול ומסחר, ועד ניהול כספים ומיסוי.",
      icon: "graduation" as const,
      modules: [
        { title: "פתיחת חשבון ב-TradeStation" },
        { title: "הגדרת מערכת אלגוטאצ'" },
        { title: "תפעול ומסחר במערכת", isNew: true },
        { title: "ניהול ומעקב שוטף" },
        { title: "משיכת כספים" },
        { title: "מיסוי" },
        { title: "קבלת תמיכה" }
      ]
    },
    {
      title: "הדרכה מקיפה למערכת TradeStation",
      description: "קורס עומק המכסה את כל היבטי מערכת TradeStation מסביבת העבודה ועד סורקי מניות, גרפים, ושליחת פקודות.",
      icon: "book" as const,
      modules: [
        { title: "הדרכת מתחילים למערכת מסחר TradeStation", duration: "1:25:56" },
        { title: "תחילת העבודה עם חשבון החוזים העתידיים", duration: "9:35" },
        { title: "סביבת עבודה", duration: "6:50" },
        { title: "ניהול חשבון", duration: "11:56" },
        { title: "היכרות עם הגרפים", duration: "10:04" },
        { title: "סורק המניות עטור הפרסים Radar Screen", duration: "6:54" },
        { title: "סורקי מניות ורשימות חמות", duration: "7:40" },
        { title: "אפשרויות שליחת פקודות", duration: "17:48" },
        { title: "סטופ לוס וטייק פרופיט", duration: "17:32" },
        { title: "הכרת המטריקס: ניתוח עומק השוק בזמן אמת", duration: "11:49" }
      ]
    },
    {
      title: "מסחר בחוזים עתידיים",
      description: "קורס מקיף העוסק במסחר בחוזים עתידיים בבורסה האמריקאית, כולל סשנים, סימולים, פקיעות ובטחונות.",
      icon: "play" as const,
      modules: [
        { title: "פתיח", duration: "1:49" },
        { title: "פעילות החוזים העתידיים הפופולרים", duration: "2:43" },
        { title: "3 הסשנים העיקריים למסחר בבורסה האמריקאית", duration: "3:38" },
        { title: "סימולים פקיעות ושווי נכסים", duration: "11:31" },
        { title: "בטחונות", duration: "5:48" },
        { title: "הזדמנות בחוזי המיקרו", duration: "4:09", isNew: true }
      ]
    }
  ];

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">קורסים</h1>
        
        <div className="mb-8">
          <p className="text-lg text-gray-600">
            הקורסים הדיגיטליים שלנו מיועדים לעזור לך להפוך למומחה במסחר באמצעות מערכת AlgoTouch.AI. 
            כל קורס מכיל מגוון שיעורים, תרגולים ומשאבים שיעזרו לך להתקדם בקצב שלך.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {coursesData.map((course, index) => (
            <CourseCard key={index} {...course} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default CoursesPage;
