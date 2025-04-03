
import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CourseLessonList from './CourseLessonList';
import CourseModuleList from './CourseModuleList';
import CourseResourceList from './CourseResourceList';
import CourseQuizList from './CourseQuizList';

interface Lesson {
  id: number;
  title: string;
  duration?: string;
  completed?: boolean;
  content?: string;
  videoUrl?: string;
}

interface Module {
  title: string;
  duration?: string;
  details?: string;
  isNew?: boolean;
}

interface Resource {
  id: number;
  title: string;
  type: string;
  size: string;
}

interface Quiz {
  id: number;
  title: string;
  questions: number;
  completed: boolean;
}

interface CourseContentTabsProps {
  activeTab: string;
  setActiveTab: (value: string) => void;
  lessons: Lesson[];
  modules: Module[];
  resources: Resource[];
  quizzes?: Quiz[];
  activeVideoId: number | null;
  watchedLessons: string[];
  completedModules: string[];
  onLessonClick: (lessonId: number) => void;
}

const CourseContentTabs = ({
  activeTab,
  setActiveTab,
  lessons,
  modules,
  resources,
  quizzes,
  activeVideoId,
  watchedLessons,
  completedModules,
  onLessonClick
}: CourseContentTabsProps) => {
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="ltr">
      <TabsList className="w-full justify-start mb-6 bg-background border-b rounded-none pb-0 h-auto">
        <TabsTrigger value="content" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-3">
          תוכן הקורס
        </TabsTrigger>
        <TabsTrigger value="resources" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-3">
          חומרי עזר
        </TabsTrigger>
        {quizzes && (
          <TabsTrigger value="quizzes" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-3">
            מבחנים
          </TabsTrigger>
        )}
      </TabsList>
      
      <TabsContent value="content" className="mt-0" dir="rtl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <CourseLessonList 
              lessons={lessons} 
              activeVideoId={activeVideoId} 
              watchedLessons={watchedLessons}
              onLessonClick={onLessonClick}
            />
          </div>
          
          <div>
            <CourseModuleList 
              modules={modules} 
              completedModules={completedModules}
            />
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="resources" className="mt-0" dir="rtl">
        <CourseResourceList resources={resources} />
      </TabsContent>
      
      {quizzes && (
        <TabsContent value="quizzes" className="mt-0" dir="rtl">
          <CourseQuizList quizzes={quizzes} />
        </TabsContent>
      )}
    </Tabs>
  );
};

export default CourseContentTabs;
