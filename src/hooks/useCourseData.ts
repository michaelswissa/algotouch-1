import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useCommunity } from '@/contexts/community/CommunityContext';
import { useAuth } from '@/contexts/auth';

// Mock course data interface
export interface Lesson {
  id: number;
  title: string;
  duration?: string;
  completed?: boolean;
  content?: string;
  videoUrl?: string;
}

export interface Module {
  title: string;
  duration?: string;
  details?: string;
  isNew?: boolean;
  lessons?: Lesson[];
}

export interface CourseResource {
  id: number;
  title: string;
  type: string;
  size: string;
}

export interface Quiz {
  id: number;
  title: string;
  questions: number;
  completed: boolean;
}

export interface Course {
  title: string;
  description: string;
  instructor: string;
  modules: Module[];
  lessons: Lesson[];
  resources: CourseResource[];
  progress: number;
  quizzes?: Quiz[];
  activeVideo?: {
    title: string;
    url: string;
    duration: string;
  };
}

export const mockCourseData: Record<string, Course> = {
  "algotouch-basics": {
    title: "קורס אלגוטאצ' למתחילים",
    description: "לימוד שיטתי של מערכת אלגוטאצ' הכולל פתיחת חשבון, הגדרת המערכת, תפעול ומסחר, ועד ניהול כספים ומיסוי.",
    instructor: "דני אלוני",
    modules: [
      { title: "פתיחת חשבון ב-TradeStation", details: "הרשמה ל-Tradestation, העברת כספים לחשבון המסחר, מילוי טפסים + התקנת הפלטפורמה של Tradestation" },
      { title: "הגדרת מערכת אלגוטאצ'", details: "בקשת גישה למערכת + התקנה, חיבור אלגוטאצ' לחשבון המסחר שלך ב-Tradestation" },
      { title: "תפעול ומסחר במערכת", isNew: true, details: "בחירת נכס למסחר, הגדרת פרקי זמן למסחר, הגדרת רמות תמיכה והתנגדות, כפתורי הפעלה והגדרות בסיסיות, ניהול יעדי רווח, ניהול סיכונים והגנה על עסקאות, שימוש חוזר ברמות תמיכה והתנגדות, שליחת פקודות מדויקות, אסטרטגיות מתקדמות לניהול עסקאות" },
      { title: "ניהול ומעקב שוטף", details: "חוקים להצלחה במסחר - הדרך למסחר יציב ורווחי, איך להוציא דו\"ח עסקאות במערכת, שינויים ואופטימיזציה לפרמטרים - שיפור ביצועים בעזרת בינה מלאכותית" },
      { title: "משיכת כספים", details: "תהליך משיכת כספים מ-Tradestation לחשבון הבנק שלך" },
      { title: "מיסוי", details: "נקודות חשובות בהקשר למיסוי רווחים מהמסחר, חישוב מס ורווחים נטו" },
      { title: "קבלת תמיכה", details: "איך ליצור קשר עם התמיכה של אלגוטאצ'" }
    ],
    lessons: [
      { id: 1, title: "מבוא למסחר אלגוריתמי", duration: "45 דקות", completed: true, videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
      { id: 2, title: "התקנת וחיבור המערכת", duration: "35 דקות", completed: true, videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
      { id: 3, title: "ממשק המשתמש", duration: "50 דקות", completed: false, videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
      { id: 4, title: "הגדרת רמות מחיר", duration: "55 דקות", completed: false, videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" },
      { id: 5, title: "הגדרות בסיסיות", duration: "40 דקות", completed: false, videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ" }
    ],
    resources: [
      { id: 1, title: "מדריך למשתמש - PDF", type: "pdf", size: "2.4 MB" },
      { id: 2, title: "גיליון סימולים - Excel", type: "excel", size: "450 KB" },
      { id: 3, title: "תבניות מסחר - ZIP", type: "zip", size: "3.1 MB" }
    ],
    progress: 40,
    quizzes: [
      { id: 1, title: "מבחן בסיסי - מושגי יסוד", questions: 10, completed: true },
      { id: 2, title: "מבחן מתקדם - אסטרטגיות מסחר", questions: 15, completed: false }
    ],
    activeVideo: {
      title: "מבוא למסחר אלגוריתמי",
      url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      duration: "45 דקות"
    }
  },
  "algotouch-advanced": {
    title: "הדרכה מקיפה למערכת TradeStation",
    description: "קורס עומק המכסה את כל היבטי מערכת TradeStation מסביבת העבודה ועד סורקי מניות, גרפים, ושליחת פקודות.",
    instructor: "מור כהן",
    modules: [
      { title: "הדרכת מתחילים למערכת מסחר טריידסטיישן", duration: "1:25:56" },
      { title: "תחילת העבודה עם חשבון החוזים העתידיים", duration: "9:35" },
      { title: "סביבת עבודה", duration: "6:50" },
      { title: "ניהול חשבון", duration: "11:56" },
      { title: "ניתוחים וחדשות על מניות חמות", duration: "11:54" },
      { title: "היכרות עם הגרפים", duration: "10:04" },
      { title: "סורק המניות עטור הפרסים Radar Screen", duration: "6:54" },
      { title: "סורקי מניות ורשימות חמות", duration: "7:40" },
      { title: "אפשרויות שליחת פקודות", duration: "17:48" },
      { title: "סטופ לוס וטייק פרופיט", duration: "17:32" },
      { title: "הכרת המטריקס: ניתוח עומק השוק בזמן אמת", duration: "11:49" },
      { title: "הדרכת מערכת TS למתקדמים", duration: "52:00" }
    ],
    lessons: [
      { id: 1, title: "אסטרטגיות מסחר באזורי תנודה", duration: "60 דקות", completed: false },
      { id: 2, title: "אסטרטגיות מגמה", duration: "55 דקות", completed: false },
      { id: 3, title: "ניהול סיכונים מתקדם", duration: "65 דקות", completed: false },
      { id: 4, title: "אופטימיזציה של אסטרטגיות", duration: "70 דקות", completed: false },
      { id: 5, title: "אסטרטגיות סקאלפינג", duration: "50 דקות", completed: false }
    ],
    resources: [
      { id: 1, title: "מדריך לאסטרטגיות מתקדמות - PDF", type: "pdf", size: "3.2 MB" },
      { id: 2, title: "אקסל אופטימיזציה - Excel", type: "excel", size: "550 KB" }
    ],
    progress: 25,
    quizzes: [
      { id: 1, title: "מבחן מערכת בסיסי", questions: 12, completed: false },
      { id: 2, title: "מבחן מתקדם - ניתוח גרפים", questions: 10, completed: false }
    ]
  },
  "market-analysis": {
    title: "מסחר בחוזים עתידיים",
    description: "קורס מקיף העוסק במסחר בחוזים עתידיים בבורסה האמריקאית, כולל סשנים, סימולים, פקיעות ובטחונות.",
    instructor: "רונית לוי",
    modules: [
      { title: "מבוא למסחר בחוזים עתידיים", duration: "45:22" },
      { title: "חוזים עתידיים על מדדים", duration: "38:15" },
      { title: "חוזים עתידיים על סחורות", duration: "42:30" },
      { title: "גמישות בטחונות", duration: "27:45" },
      { title: "סשנים בשוק החוזים העתידיים", duration: "33:10" },
      { title: "פקיעות ורולים", duration: "29:55" },
      { title: "יתרונות וחסרונות במסחר בחוזים", duration: "35:20" }
    ],
    lessons: [
      { id: 1, title: "מושגי יסוד בחוזים עתידיים", duration: "40 דקות", completed: false },
      { id: 2, title: "מינוף וניהול סיכונים", duration: "45 דקות", completed: false },
      { id: 3, title: "עונתיות בחוזים על סחורות", duration: "50 דקות", completed: false },
      { id: 4, title: "אסטרטגיות ספרדים", duration: "65 דקות", completed: false }
    ],
    resources: [
      { id: 1, title: "לוח מועדי פקיעה - PDF", type: "pdf", size: "1.8 MB" },
      { id: 2, title: "מחשבון מרווחים - Excel", type: "excel", size: "350 KB" }
    ],
    progress: 10
  }
};

export const useCourseData = (courseId: string | undefined) => {
  const { isAuthenticated, user } = useAuth();
  const { 
    recordLessonWatched, 
    completeModule, 
    completeCourse,
    courseProgress,
    userBadges
  } = useCommunity();

  const [activeTab, setActiveTab] = useState('content');
  const [activeVideoId, setActiveVideoId] = useState<number | null>(1);
  
  // Get course data
  const courseData = courseId && mockCourseData[courseId] 
    ? mockCourseData[courseId] 
    : Object.values(mockCourseData)[0];

  // Get active lesson and video info
  const activeLesson = courseData.lessons.find(lesson => lesson.id === activeVideoId);
  const videoUrl = activeLesson?.videoUrl || courseData.activeVideo?.url;
  const videoTitle = activeLesson?.title || courseData.activeVideo?.title || '';

  // Get user progress for this course
  const userProgress = courseProgress.find(progress => progress.courseId === courseId);
  
  const calculateProgress = () => {
    if (!userProgress || courseData.lessons.length === 0) {
      return courseData.progress;
    }
    
    const watchedCount = userProgress.lessonsWatched.length;
    return Math.round((watchedCount / courseData.lessons.length) * 100);
  };
  
  const progressPercentage = calculateProgress();

  const findModuleForLesson = (lessonId: number) => {
    const lessonIndex = courseData.lessons.findIndex(lesson => lesson.id === lessonId);
    if (lessonIndex === -1) return null;
    
    const moduleIndex = Math.floor(lessonIndex / (courseData.lessons.length / courseData.modules.length));
    return courseData.modules[moduleIndex < courseData.modules.length ? moduleIndex : 0];
  };
  
  const checkAllModuleLessonsWatched = (module: any) => {
    if (!userProgress) return false;
    
    const moduleIndex = courseData.modules.indexOf(module);
    const lessonsPerModule = Math.ceil(courseData.lessons.length / courseData.modules.length);
    const startIdx = moduleIndex * lessonsPerModule;
    const endIdx = Math.min(startIdx + lessonsPerModule, courseData.lessons.length);
    
    const moduleLessons = courseData.lessons.slice(startIdx, endIdx);
    
    return moduleLessons.every(lesson => 
      userProgress.lessonsWatched.includes(lesson.id.toString())
    );
  };
  
  const checkAllModulesCompleted = () => {
    if (!userProgress) return false;
    
    return courseData.modules.every((_, index) => 
      userProgress.modulesCompleted.includes(index.toString())
    );
  };

  const handleLessonClick = async (lessonId: number) => {
    setActiveVideoId(lessonId);
    
    if (isAuthenticated && user) {
      const lessonIdStr = lessonId.toString();
      await recordLessonWatched(courseId || 'unknown', lessonIdStr);
      
      const lessonModule = findModuleForLesson(lessonId);
      if (lessonModule) {
        const moduleId = courseData.modules.indexOf(lessonModule).toString();
        const allModuleLessonsWatched = checkAllModuleLessonsWatched(lessonModule);
        
        if (allModuleLessonsWatched) {
          await completeModule(courseId || 'unknown', moduleId);
          
          const allModulesCompleted = checkAllModulesCompleted();
          if (allModulesCompleted) {
            await completeCourse(courseId || 'unknown');
          }
        }
      }
    } else if (!isAuthenticated) {
      toast.info('התחבר כדי לצבור נקודות על הצפייה בשיעורים');
    }
  };
  
  const handleVideoEnded = async () => {
    if (isAuthenticated && activeVideoId) {
      toast.success('השיעור הושלם!', {
        description: 'המשך לשיעור הבא כדי להמשיך ללמוד',
        duration: 3000,
      });
    }
  };
  
  const hasCourseCompletionBadge = () => {
    if (!courseId) return false;
    
    return userBadges.some(userBadge => 
      userBadge.badge.name.includes(courseData.title.substring(0, 10))
    );
  };

  return {
    courseData,
    activeTab,
    setActiveTab,
    activeVideoId,
    activeLesson,
    videoUrl,
    videoTitle,
    progressPercentage,
    userProgress,
    handleLessonClick,
    handleVideoEnded,
    hasCourseCompletionBadge
  };
};
