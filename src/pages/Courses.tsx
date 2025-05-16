
import React, { useState, Suspense } from 'react';
import Layout from '@/components/Layout';
import CoursesComponent from '@/components/Courses';
import { GraduationCap, BookOpen, Award, Users, LightbulbIcon } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LoadingPage } from '@/components/ui/spinner';

const CoursesFeatures = () => {
  const features = [
    {
      title: "קורסים מקצועיים",
      description: "למד מהמומחים המובילים בתחום המסחר האלגוריתמי",
      icon: <GraduationCap className="h-6 w-6 text-primary" />
    },
    {
      title: "תוכן עדכני",
      description: "תכנים מעודכנים לשנת 2025 עם הטכניקות והכלים החדשים ביותר",
      icon: <BookOpen className="h-6 w-6 text-blue-500" />
    },
    {
      title: "הסמכות מוכרות",
      description: "השלם קורסים וקבל תעודות המוכרות בקהילת המסחר העולמית",
      icon: <Award className="h-6 w-6 text-yellow-500" />
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
      {features.map((feature, index) => (
        <Card key={index} className="p-6 hover-scale glass-card-2025 hover:border-primary/30 transition-all duration-300">
          <div className="flex flex-col items-center text-center">
            <div className="p-3 rounded-full bg-primary/10 mb-4 float">
              {feature.icon}
            </div>
            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
            <p className="text-muted-foreground text-sm">{feature.description}</p>
          </div>
        </Card>
      ))}
    </div>
  );
};

const CoursesPageContent = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  // Function to log which course was selected
  const handleCourseClick = (courseId: string) => {
    console.log("קורס נבחר:", courseId);
    setSelectedCourseId(courseId);
  };

  return (
    <>
      <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
        <GraduationCap size={28} className="text-primary" />
        <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">קורסים</span>
      </h1>
      
      {/* Hero section */}
      <div className="glass-card-2025 p-6 mb-10 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl"></div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-3 text-gradient-blue">פיתוח מיומנויות מסחר מתקדמות</h2>
          <p className="text-lg mb-6 max-w-3xl">
            הקורסים שלנו מציעים תוכן מקצועי ועדכני שיעזור לך להתפתח כסוחר. למד טכניקות מתקדמות, אסטרטגיות מסחר אלגוריתמי, וכלים חדשניים בתחום.
          </p>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full text-sm">
              <Users className="h-4 w-4 text-primary" />
              <span>+5,000 תלמידים</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full text-sm">
              <BookOpen className="h-4 w-4 text-primary" />
              <span>12 קורסים</span>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-full text-sm">
              <LightbulbIcon className="h-4 w-4 text-primary" />
              <span>עדכונים חודשיים</span>
            </div>
          </div>
        </div>
      </div>
      
      <CoursesFeatures />
      
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BookOpen size={24} className="text-primary" />
        <span>הקורסים שלנו</span>
      </h2>
      
      <div className="mb-10">
        <ErrorBoundary fallback={
          <div className="p-4 border border-red-200 bg-red-50 rounded-md text-center">
            <h3 className="font-bold mb-2">לא ניתן לטעון את הקורסים כרגע</h3>
            <p>אנא נסה שוב מאוחר יותר</p>
          </div>
        }>
          <CoursesComponent 
            onCourseClick={handleCourseClick} 
            selectedCourseId={selectedCourseId} 
          />
        </ErrorBoundary>
      </div>
    </>
  );
};

// Export as default Courses (the name App.tsx expects)
const Courses = () => {
  return (
    <Layout>
      <div className="tradervue-container py-6 max-w-6xl mx-auto">
        <ErrorBoundary fallback={
          <div className="text-center p-6">
            <h2 className="text-2xl font-bold mb-4">לא ניתן לטעון את עמוד הקורסים</h2>
            <p className="mb-4">אירעה שגיאה בטעינת העמוד. אנא נסה לרענן את הדף.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90 transition-colors"
            >
              רענן עמוד
            </button>
          </div>
        }>
          <Suspense fallback={<LoadingPage message="טוען קורסים..." />}>
            <CoursesPageContent />
          </Suspense>
        </ErrorBoundary>
      </div>
    </Layout>
  );
};

export default Courses;

// Add named exports for internal use
export { Courses as CoursesPage };
