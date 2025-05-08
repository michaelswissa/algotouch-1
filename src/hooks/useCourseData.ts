import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { recordLessonWatched, completeModule, completeCourse } from '@/lib/community/course-service';

// Define the types for course data
interface Lesson {
  id: number;
  title: string;
  videoUrl: string;
  duration: string;
  moduleId: number;
}

interface Module {
  id: number;
  title: string;
  description: string;
  lessonIds: number[];
}

interface Quiz {
  id: number;
  title: string;
  questions: number;
  completed: boolean;
}

interface Resource {
  id: number;
  title: string;
  type: string;
  size: string;
}

interface CourseData {
  id: string;
  title: string;
  description: string;
  instructor: string;
  lessons: Lesson[];
  modules: Module[];
  quizzes: Quiz[];
  resources: Resource[];
}

interface UserProgress {
  lessonsWatched: number[];
  modulesCompleted: number[];
  courseCompleted: boolean;
  lastWatchedLessonId?: number;
}

// Example course data - in a real app, this would come from an API
const mockCourseData: Record<string, CourseData> = {
  'algotouch-basics': {
    id: 'algotouch-basics',
    title: 'יסודות המסחר עם AlgoTouch',
    description: 'קורס מקיף ללימוד יסודות המסחר האלגוריתמי בפלטפורמת AlgoTouch',
    instructor: 'דר׳ אלגו',
    lessons: [
      { id: 1, title: 'מבוא למסחר אלגוריתמי', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '12:30', moduleId: 1 },
      { id: 2, title: 'הכרת פלטפורמת AlgoTouch', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '15:45', moduleId: 1 },
      { id: 3, title: 'יצירת אסטרטגיה ראשונה', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '18:20', moduleId: 1 },
      { id: 4, title: 'עבודה עם נתוני מחיר', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '20:15', moduleId: 2 },
      { id: 5, title: 'אינדיקטורים טכניים', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '22:40', moduleId: 2 },
      { id: 6, title: 'מבנה וניהול תיק השקעות', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '14:55', moduleId: 3 },
      { id: 7, title: 'ניהול סיכונים', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', duration: '16:30', moduleId: 3 },
    ],
    modules: [
      { 
        id: 1, 
        title: 'מבוא ויסודות', 
        description: 'הכרת עולם המסחר האלגוריתמי והבנת היתרונות שבשימוש בכלים ממוחשבים', 
        lessonIds: [1, 2, 3] 
      },
      { 
        id: 2, 
        title: 'ניתוח טכני', 
        description: 'לימוד שיטות וכלים לניתוח טכני אפקטיבי של גרפים וזיהוי מגמות', 
        lessonIds: [4, 5] 
      },
      { 
        id: 3, 
        title: 'אסטרטגיות מסחר', 
        description: 'פיתוח אסטרטגיות מסחר מתקדמות ושילובן בפלטפורמה', 
        lessonIds: [6, 7] 
      }
    ],
    resources: [
      { id: 1, title: 'מדריך למשתמש AlgoTouch', type: 'PDF', size: '2.4MB' },
      { id: 2, title: 'טבלת אינדיקטורים טכניים', type: 'XLSX', size: '1.1MB' },
      { id: 3, title: 'תבנית לניהול יומן מסחר', type: 'PDF', size: '0.8MB' }
    ],
    quizzes: [
      { id: 1, title: 'מבחן יסודות - חלק א', questions: 10, completed: true },
      { id: 2, title: 'מבחן יסודות - חלק ב', questions: 15, completed: false },
      { id: 3, title: 'מבחן סיום קורס', questions: 25, completed: false }
    ]
  }
};

export const useCourseData = (courseId: string | undefined) => {
  const [courseData, setCourseData] = useState<CourseData>({
    id: '',
    title: '',
    description: '',
    instructor: '',
    lessons: [],
    modules: [],
    quizzes: [],
    resources: []
  });
  const [activeTab, setActiveTab] = useState('content');
  const [activeVideoId, setActiveVideoId] = useState<number | null>(null);
  const [userProgress, setUserProgress] = useState<UserProgress>({
    lessonsWatched: [],
    modulesCompleted: [],
    courseCompleted: false
  });
  
  const { toast } = useToast();

  // Load course data when courseId changes
  useEffect(() => {
    if (courseId && mockCourseData[courseId]) {
      setCourseData(mockCourseData[courseId]);
      
      // Load progress from local storage
      const savedProgress = localStorage.getItem(`course-progress-${courseId}`);
      if (savedProgress) {
        const parsedProgress = JSON.parse(savedProgress) as UserProgress;
        setUserProgress(parsedProgress);
        
        // If there's a last watched lesson, make it active
        if (parsedProgress.lastWatchedLessonId) {
          setActiveVideoId(parsedProgress.lastWatchedLessonId);
        } else if (mockCourseData[courseId].lessons.length > 0) {
          // Otherwise, set the first lesson as active
          setActiveVideoId(mockCourseData[courseId].lessons[0].id);
        }
      } else if (mockCourseData[courseId].lessons.length > 0) {
        // If no saved progress, set the first lesson as active
        setActiveVideoId(mockCourseData[courseId].lessons[0].id);
      }
    }
  }, [courseId]);

  // Handle lesson click
  const handleLessonClick = (lessonId: number) => {
    setActiveVideoId(lessonId);
    
    // Update last watched lesson in progress
    if (courseId) {
      const updatedProgress = {
        ...userProgress,
        lastWatchedLessonId: lessonId
      };
      setUserProgress(updatedProgress);
      localStorage.setItem(`course-progress-${courseId}`, JSON.stringify(updatedProgress));
    }
  };

  // Mark video as completed when it ends
  const handleVideoEnded = () => {
    if (activeVideoId && courseId) {
      // Add to watched lessons if not already there
      if (!userProgress.lessonsWatched.includes(activeVideoId)) {
        const updatedLessons = [...userProgress.lessonsWatched, activeVideoId];
        
        const updatedProgress = {
          ...userProgress,
          lessonsWatched: updatedLessons,
        };
        
        // Check if this completes a module
        const lesson = courseData.lessons.find(l => l.id === activeVideoId);
        if (lesson) {
          const module = courseData.modules.find(m => m.id === lesson.moduleId);
          if (module) {
            // Check if all lessons in this module are now watched
            const allModuleLessonsWatched = module.lessonIds.every(id => 
              updatedLessons.includes(id)
            );
            
            if (allModuleLessonsWatched && !userProgress.modulesCompleted.includes(module.id)) {
              // Mark module as completed
              updatedProgress.modulesCompleted = [...userProgress.modulesCompleted, module.id];
              
              // Call external module completion function
              completeModule(courseId, module.id);
              
              toast({
                title: "מודול הושלם!",
                description: `השלמת את המודול "${module.title}"`,
              });
            }
          }
        }
        
        // Check if all modules are completed
        const allModulesCompleted = courseData.modules.every(module => 
          updatedProgress.modulesCompleted.includes(module.id)
        );
        
        if (allModulesCompleted && !userProgress.courseCompleted) {
          updatedProgress.courseCompleted = true;
          
          // Call external course completion function
          completeCourse(courseId);
          
          toast({
            title: "הקורס הושלם!",
            description: "כל הכבוד! השלמת את כל המודולים בקורס",
          });
        }
        
        setUserProgress(updatedProgress);
        localStorage.setItem(`course-progress-${courseId}`, JSON.stringify(updatedProgress));
        
        // Call external lesson completion function
        recordLessonWatched(courseId, activeVideoId);
      }
    }
  };
  
  // Handle video progress updates
  const handleVideoProgress = (event: any) => {
    // You can track video progress here if needed
    console.log('Video progress:', event);
  };
  
  // Calculate progress percentage
  const progressPercentage = courseData.lessons.length > 0
    ? Math.round((userProgress.lessonsWatched.length / courseData.lessons.length) * 100)
    : 0;
    
  // Check if user has earned the course completion badge
  const hasCourseCompletionBadge = () => {
    return userProgress.courseCompleted;
  };

  return {
    courseData,
    activeTab,
    setActiveTab,
    activeVideoId,
    userProgress,
    handleLessonClick,
    progressPercentage,
    hasCourseCompletionBadge,
    handleVideoEnded,
    handleVideoProgress
  };
};
