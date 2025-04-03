import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronRight, Play, CheckCircle2, Clock, FileText, Video, Volume2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { CommunityProvider, useCommunity } from '@/contexts/community/CommunityContext';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

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
  lessons?: Lesson[];
}

interface Course {
  title: string;
  description: string;
  instructor: string;
  modules: Module[];
  lessons: Lesson[];
  resources: {
    id: number;
    title: string;
    type: string;
    size: string;
  }[];
  progress: number;
  quizzes?: {
    id: number;
    title: string;
    questions: number;
    completed: boolean;
  }[];
  activeVideo?: {
    title: string;
    url: string;
    duration: string;
  };
}

const mockCourseData: Record<string, Course> = {
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
      { title: "גמישות בטחו��ות", duration: "27:45" },
      { title: "סשנים בשוק החוזים העתידיים", duration: "33:10" },
      { title: "פקיעות ורולים", duration: "29:55" },
      { title: "יתרונות וחסרונות במסחר בחוזים", duration: "35:20" }
    ],
    lessons: [
      { id: 1, title: "מושגי יסוד בחוזים עתידיים", duration: "40 דקות", completed: false },
      { id: 2, title: "מינוף וניהול סיכונים", duration: "45 דקות", completed: false },
      { id: 3, title: "עונתיות בחוזים על סחורות", duration: "50 דקות", completed: false },
      { id: 4, title: "אסטרטגיות ��פרדים", duration: "65 דקות", completed: false }
    ],
    resources: [
      { id: 1, title: "לוח מועדי פקיעה - PDF", type: "pdf", size: "1.8 MB" },
      { id: 2, title: "מחשבון מרווחים - Excel", type: "excel", size: "350 KB" }
    ],
    progress: 10
  }
};

const CourseDetailContent = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [activeTab, setActiveTab] = useState('content');
  const [activeVideoId, setActiveVideoId] = useState<number | null>(1);
  const { isAuthenticated, user } = useAuth();
  const { 
    recordLessonWatched, 
    completeModule, 
    completeCourse,
    courseProgress,
    userBadges
  } = useCommunity();
  
  const courseData = courseId && mockCourseData[courseId] ? mockCourseData[courseId] : Object.values(mockCourseData)[0];

  const activeLesson = courseData.lessons.find(lesson => lesson.id === activeVideoId);
  const videoUrl = activeLesson?.videoUrl || courseData.activeVideo?.url;
  const videoTitle = activeLesson?.title || courseData.activeVideo?.title || '';

  const userProgress = courseProgress.find(progress => progress.courseId === courseId);
  
  const calculateProgress = () => {
    if (!userProgress || courseData.lessons.length === 0) {
      return courseData.progress;
    }
    
    const watchedCount = userProgress.lessonsWatched.length;
    return Math.round((watchedCount / courseData.lessons.length) * 100);
  };
  
  const progressPercentage = calculateProgress();

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
  
  const hasCourseCompletionBadge = () => {
    if (!courseId) return false;
    
    return userBadges.some(userBadge => 
      userBadge.badge.name.includes(courseData.title.substring(0, 10))
    );
  };

  const handleVideoEnded = async () => {
    if (isAuthenticated && activeVideoId) {
      toast.success('השיעור הושלם!', {
        description: 'המשך לשיעור הבא כדי להמשיך ללמוד',
        duration: 3000,
      });
    }
  };

  return (
    <Layout className="p-4 md:p-6">
      <div className="mb-4">
        <Link to="/courses" className="text-primary hover:text-primary/90 flex items-center text-sm font-medium mb-2">
          <ChevronRight className="size-4 rotate-180 mr-1" />
          חזרה לכל הקורסים
        </Link>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-foreground">{courseData.title}</h1>
        <p className="text-muted-foreground">{courseData.description}</p>
        
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">מדריך:</span>
            <span className="text-sm text-muted-foreground">{courseData.instructor}</span>
          </div>
          
          <div className="sm:mr-6 flex items-center gap-2">
            <span className="text-sm font-medium">התקדמות:</span>
            <div className="w-full max-w-48 flex items-center gap-2">
              <Progress value={progressPercentage} className="h-2" />
              <span className="text-sm text-tradervue-green">{progressPercentage}%</span>
            </div>
          </div>
          
          <div className="sm:mr-auto">
            <Button className="gap-2">
              <Play className="size-4" />
              המשך ללמוד {isAuthenticated && "(+5 נקודות)"}
            </Button>
          </div>
        </div>
        
        {hasCourseCompletionBadge() && (
          <div className="mt-3 bg-primary/10 text-primary px-3 py-2 rounded-md flex items-center gap-2">
            <CheckCircle2 className="size-4" />
            <span className="text-sm font-medium">קורס הושלם! קיבלת תעודה על השלמת הקורס</span>
          </div>
        )}
      </div>
      
      <div className="mb-6 bg-background/40 rounded-xl overflow-hidden shadow-lg border border-primary/10">
        <div className="relative pt-[56.25%] w-full overflow-hidden">
          <iframe 
            className="absolute top-0 left-0 w-full h-full"
            src={videoUrl}
            title={videoTitle}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onEnded={handleVideoEnded}
          ></iframe>
        </div>
        <div className="p-4 flex justify-between items-center bg-card/80 backdrop-blur-sm border-t">
          <div className="flex-1">
            <h3 className="font-medium text-lg">{videoTitle}</h3>
            <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
              <Clock className="size-3.5" />
              <span>{activeLesson?.duration || courseData.activeVideo?.duration}</span>
              <div className="flex items-center gap-1 mr-4">
                <Volume2 className="size-3.5" />
                <span>100%</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="text-xs">
              הורד
            </Button>
            <Button size="sm" className="text-xs">
              שתף
            </Button>
          </div>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full" dir="ltr">
        <TabsList className="w-full justify-start mb-6 bg-background border-b rounded-none pb-0 h-auto">
          <TabsTrigger value="content" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-3">
            תוכן הקורס
          </TabsTrigger>
          <TabsTrigger value="resources" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-3">
            חומרי עזר
          </TabsTrigger>
          {courseData.quizzes && (
            <TabsTrigger value="quizzes" className="rounded-b-none data-[state=active]:border-b-2 data-[state=active]:border-primary pb-3">
              מבחנים
            </TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="content" className="mt-0" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card className="bg-card/80 backdrop-blur-sm border">
                <CardHeader>
                  <CardTitle className="text-xl">שיעורים אחרונים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courseData.lessons.map(lesson => {
                      const isWatched = userProgress?.lessonsWatched.includes(lesson.id.toString());
                      
                      return (
                        <div 
                          key={lesson.id} 
                          className={`p-3 border rounded-lg flex items-center gap-3 hover:bg-muted/50 transition-colors cursor-pointer
                                  ${activeVideoId === lesson.id ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => handleLessonClick(lesson.id)}
                        >
                          <Button size="icon" variant={activeVideoId === lesson.id ? "default" : "secondary"} className="size-10 rounded-full flex-shrink-0">
                            <Play className="size-5" />
                          </Button>
                          <div className="flex-grow">
                            <h3 className="font-medium">{lesson.title}</h3>
                            {lesson.duration && (
                              <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                <Clock className="size-3.5" />
                                {lesson.duration}
                              </div>
                            )}
                          </div>
                          {isWatched || lesson.completed ? (
                            <CheckCircle2 className="size-5 text-tradervue-green flex-shrink-0" />
                          ) : (
                            <Button size="sm" variant="ghost" className="flex-shrink-0">
                              המשך
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="bg-card/80 backdrop-blur-sm border">
                <CardHeader>
                  <CardTitle className="text-xl">מודולים</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courseData.modules.map((module, index) => {
                      const isCompleted = userProgress?.modulesCompleted.includes(index.toString());
                      
                      return (
                        <div key={index} className="group">
                          <div className="flex gap-3 items-start p-2 rounded-lg hover:bg-muted/30 transition-colors">
                            <div className={`mt-0.5 size-6 rounded-full ${isCompleted ? 'bg-green-500 text-white' : 'bg-primary/10 text-primary'} flex items-center justify-center text-xs font-medium flex-shrink-0`}>
                              {isCompleted ? <CheckCircle2 className="size-4" /> : index + 1}
                            </div>
                            <div>
                              <h3 className="font-medium group-hover:text-primary transition-colors">
                                {module.title}
                                {module.isNew && (
                                  <span className="mr-2 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs font-semibold">
                                    חדש
                                  </span>
                                )}
                                {isCompleted && (
                                  <span className="mr-2 bg-green-100 text-green-600 px-1.5 py-0.5 rounded text-xs font-semibold">
                                    הושלם
                                  </span>
                                )}
                              </h3>
                              {module.duration && (
                                <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                                  <Clock className="size-3.5" />
                                  {module.duration}
                                </div>
                              )}
                              {module.details && <p className="text-sm text-muted-foreground mt-1">{module.details}</p>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="resources" className="mt-0" dir="rtl">
          <Card className="bg-card/80 backdrop-blur-sm border">
            <CardHeader>
              <CardTitle className="text-xl">חומרים להורדה</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {courseData.resources.map(resource => (
                  <div key={resource.id} className="p-3 border rounded-lg flex items-center gap-3 hover:bg-muted/50 transition-colors">
                    <div className="size-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <FileText className="size-5 text-primary" />
                    </div>
                    <div className="flex-grow">
                      <h3 className="font-medium">{resource.title}</h3>
                      <div className="text-sm text-muted-foreground mt-1">
                        {resource.size}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" className="flex-shrink-0">
                      הורדה
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {courseData.quizzes && (
          <TabsContent value="quizzes" className="mt-0" dir="rtl">
            <Card className="bg-card/80 backdrop-blur-sm border">
              <CardHeader>
                <CardTitle className="text-xl">מבחנים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {courseData.quizzes.map(quiz => (
                    <div key={quiz.id} className="p-3 border rounded-lg flex items-center gap-3 hover:bg-muted/50 transition-colors">
                      <div className="size-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                        <FileText className="size-5 text-primary" />
                      </div>
                      <div className="flex-grow">
                        <h3 className="font-medium">{quiz.title}</h3>
                        <div className="text-sm text-muted-foreground mt-1">
                          {quiz.questions} שאלות
                        </div>
                      </div>
                      {quiz.completed ? (
                        <div className="flex items-center gap-1 text-tradervue-green text-sm mr-2">
                          <CheckCircle2 className="size-4" />
                          הושלם
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="flex-shrink-0">
                          התחל מבחן
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </Layout>
  );
};

const CourseDetail = () => {
  return (
    <CommunityProvider>
      <CourseDetailContent />
    </CommunityProvider>
  );
};

export default CourseDetail;
