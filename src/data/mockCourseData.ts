
export interface Course {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: Lesson[];
  modules: Module[];
  activeVideo?: {
    url: string;
    title: string;
  };
}

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
}

export const getCourseData = (courseId?: string): Course => {
  // Default course data if no courseId is provided
  return {
    id: courseId || 'default-course',
    title: 'יסודות מסחר אלגוריתמי',
    description: 'קורס מקיף לבניית אסטרטגיות מסחר אלגוריתמיות',
    progress: 30,
    lessons: [
      { id: 1, title: 'מבוא לאלגוריתם מסחר', duration: '12:30', completed: true, videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 2, title: 'יצירת אסטרטגיה בסיסית', duration: '15:45', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' },
      { id: 3, title: 'ניתוח נתונים היסטוריים', duration: '20:10', videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ' }
    ],
    modules: [
      { title: "מבוא למסחר אלגוריתמי", duration: "2 שעות", details: "הכרת עקרונות בסיסיים" },
      { title: "ניתוח נתונים היסטוריים", duration: "3 שעות", details: "עיבוד וניתוח דאטה לצורך פיתוח אלגוריתמים" },
      { title: "בניית אסטרטגיה ראשונה", duration: "4 שעות", details: "פיתוח אלגוריתם מסחר בסיסי" },
      { title: "אופטימיזציה ובדיקות", duration: "3 שעות", details: "שיפור ביצועים ומניעת אוברפיטינג", isNew: true }
    ],
    activeVideo: {
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      title: 'מבוא לאלגוריתם מסחר'
    }
  };
};

// Mock user progress data for courses
export const mockUserProgress = [
  {
    courseId: 'algo-trading-basics',
    lessonsWatched: ['1', '2'],
    modulesCompleted: ['0'],
    completionDate: null
  },
  {
    courseId: 'risk-management',
    lessonsWatched: ['1'],
    modulesCompleted: [],
    completionDate: null
  }
];
