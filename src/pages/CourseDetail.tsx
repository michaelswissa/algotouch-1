
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronRight, Play, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface Lesson {
  id: number;
  title: string;
  duration?: string;
  completed?: boolean;
  content?: string;
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
      { id: 1, title: "מבוא למסחר אלגוריתמי", duration: "45 דקות", completed: true },
      { id: 2, title: "התקנת וחיבור המערכת", duration: "35 דקות", completed: true },
      { id: 3, title: "ממשק המשתמש", duration: "50 דקות", completed: false },
      { id: 4, title: "הגדרת רמות מחיר", duration: "55 דקות", completed: false },
      { id: 5, title: "הגדרות בסיסיות", duration: "40 דקות", completed: false }
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
    ]
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
      { title: "פתיח", duration: "1:49" },
      { title: "פעילות החוזים העתידיים הפופולרים", duration: "2:43" },
      { title: "3 הסשנים העיקריים למסחר בבורסה האמריקאית", duration: "3:38" },
      { title: "סימולים פקיעות ושווי נכסים", duration: "11:31" },
      { title: "בטחונות", duration: "5:48" },
      { title: "הזדמנות בחוזי המיקרו", duration: "4:09", isNew: true }
    ],
    lessons: [
      { id: 1, title: "יסודות הניתוח הטכני", duration: "55 דקות", completed: true },
      { id: 2, title: "זיהוי מגמות ונקודות מפנה", duration: "60 דקות", completed: true },
      { id: 3, title: "ניתוח רב-מסגרת זמן", duration: "50 דקות", completed: true },
      { id: 4, title: "אינדיקטורים מתקדמים", duration: "65 דקות", completed: true },
      { id: 5, title: "שילוב ניתוח פונדמנטלי", duration: "70 דקות", completed: false }
    ],
    resources: [
      { id: 1, title: "מדריך מלא לניתוח טכני - PDF", type: "pdf", size: "4.1 MB" },
      { id: 2, title: "גיליון מתנדים - Excel", type: "excel", size: "320 KB" },
      { id: 3, title: "תבניות נרות יפניים - PDF", type: "pdf", size: "1.8 MB" }
    ],
    progress: 80,
    quizzes: [
      { id: 1, title: "מבחן ידע בחוזים עתידיים", questions: 15, completed: true },
      { id: 2, title: "מבחן מתקדם - אסטרטגיות מסחר", questions: 20, completed: false }
    ]
  }
};

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const [activeTab, setActiveTab] = useState('lessons');
  const course = courseId ? mockCourseData[courseId as keyof typeof mockCourseData] : null;

  if (!course) {
    return (
      <Layout>
        <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
          <h1 className="text-3xl font-bold mb-6">קורס לא נמצא</h1>
          <Link to="/courses">
            <Button>חזרה לרשימת הקורסים</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const completedLessons = course.lessons.filter(lesson => lesson.completed).length;
  const progress = course.progress || Math.round((completedLessons / course.lessons.length) * 100);

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <div className="flex items-center mb-4">
          <Link to="/courses" className="flex items-center text-blue-600 hover:underline">
            <ChevronRight size={16} className="ml-1" />
            <span>חזרה לרשימת הקורסים</span>
          </Link>
        </div>

        <h1 className="text-3xl font-bold mb-2">{course.title}</h1>
        <p className="text-gray-600 mb-6">{course.description}</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>צפייה בקורס</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-gray-900 rounded-md mb-4 flex items-center justify-center">
                  <div className="text-center text-white">
                    <Play className="h-12 w-12 mx-auto mb-2 opacity-60" />
                    <h3 className="text-xl font-medium">התחל בצפייה בקורס</h3>
                    <p className="text-gray-400 mt-2">לחץ על שיעור מהרשימה למטה להתחלת הצפייה</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="lessons" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger value="lessons" className="flex-1">שיעורים</TabsTrigger>
                <TabsTrigger value="modules" className="flex-1">מודולים</TabsTrigger>
                <TabsTrigger value="quizzes" className="flex-1">מבחנים</TabsTrigger>
                <TabsTrigger value="resources" className="flex-1">חומרי עזר</TabsTrigger>
                <TabsTrigger value="notes" className="flex-1">הערות</TabsTrigger>
              </TabsList>

              <TabsContent value="lessons" className="space-y-4 mt-4">
                {course.lessons.map((lesson) => (
                  <Card key={lesson.id} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        {lesson.completed ? (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-green-100 text-green-600 ml-4">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 ml-4">
                            <Play className="h-5 w-5" />
                          </div>
                        )}
                        <div>
                          <h4 className="font-medium">{lesson.title}</h4>
                          <div className="flex items-center text-sm text-gray-500">
                            <Clock className="h-3 w-3 ml-1" />
                            <span>{lesson.duration}</span>
                          </div>
                        </div>
                      </div>
                      <Button variant={lesson.completed ? "outline" : "default"} size="sm">
                        {lesson.completed ? 'צפה שוב' : 'צפה עכשיו'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="modules" className="space-y-4 mt-4">
                {course.modules.map((module, idx) => (
                  <Card key={idx} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 ml-3">
                            <span className="font-bold">{idx + 1}</span>
                          </div>
                          <div>
                            <h4 className="font-medium">{module.title}</h4>
                            {module.duration && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Clock className="h-3 w-3 ml-1" />
                                <span>{module.duration}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        {module.isNew && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">חדש</span>
                        )}
                      </div>
                      {module.details && (
                        <p className="text-sm text-gray-600 mt-2 pr-11">{module.details}</p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="quizzes" className="space-y-4 mt-4">
                {course.quizzes ? course.quizzes.map((quiz) => (
                  <Card key={quiz.id} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          quiz.completed ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'
                        } ml-4`}>
                          {quiz.completed ? <CheckCircle2 className="h-5 w-5" /> : <span className="font-bold">?</span>}
                        </div>
                        <div>
                          <h4 className="font-medium">{quiz.title}</h4>
                          <div className="text-sm text-gray-500">
                            {quiz.questions} שאלות
                          </div>
                        </div>
                      </div>
                      <Button variant={quiz.completed ? "outline" : "default"} size="sm">
                        {quiz.completed ? 'בצע שוב' : 'התחל מבחן'}
                      </Button>
                    </CardContent>
                  </Card>
                )) : (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <p className="text-gray-500">אין מבחנים זמינים לקורס זה</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="resources" className="space-y-4 mt-4">
                {course.resources.map((resource) => (
                  <Card key={resource.id} className="cursor-pointer hover:shadow-md transition-all">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 ml-4">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <h4 className="font-medium">{resource.title}</h4>
                          <div className="text-sm text-gray-500">
                            {resource.size}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        הורד
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="notes" className="mt-4">
                <Card>
                  <CardContent className="p-4">
                    <textarea 
                      className="w-full h-64 p-3 border rounded-md resize-none"
                      placeholder="כאן תוכל לרשום הערות אישיות על הקורס..."
                    ></textarea>
                    <div className="flex justify-end mt-2">
                      <Button>שמור הערות</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="md:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle>פרטי הקורס</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="text-sm text-gray-500 mb-1">מדריך</h4>
                  <p className="font-medium">{course.instructor}</p>
                </div>

                <div>
                  <h4 className="text-sm text-gray-500 mb-1">התקדמות</h4>
                  <Progress value={progress} className="h-2 mb-1" />
                  <p className="text-sm mt-1">{completedLessons} מתוך {course.lessons.length} שיעורים הושלמו ({progress}%)</p>
                </div>

                <div>
                  <h4 className="text-sm text-gray-500 mb-1">אורך הקורס</h4>
                  <p className="font-medium">{course.lessons.length} שיעורים</p>
                </div>

                <Button className="w-full">המשך את הקורס</Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default CourseDetailPage;
