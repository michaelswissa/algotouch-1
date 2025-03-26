
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import Courses from '@/components/Courses';
import { GraduationCap, BookOpen, Award } from 'lucide-react';
import { Card } from '@/components/ui/card';

const CoursesPage = () => {
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  
  // Function to log which course was selected
  const handleCourseClick = (courseId: string) => {
    console.log("קורס נבחר:", courseId);
    setSelectedCourseId(courseId);
  };

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
    <Layout>
      <div className="tradervue-container py-6">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <GraduationCap size={28} className="text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">קורסים</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {features.map((feature, index) => (
            <Card key={index} className="p-6 hover-scale bg-gradient-to-br from-card to-secondary/80 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-secondary mb-4 float">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
        
        <Courses onCourseClick={handleCourseClick} selectedCourseId={selectedCourseId} />
      </div>
    </Layout>
  );
};

export default CoursesPage;
