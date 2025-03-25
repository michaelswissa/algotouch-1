
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronRight, Play, CheckCircle2, Clock, FileText } from 'lucide-react';

const mockCourseData = {
  "algotouch-basics": {
    title: "קורס אלגוטאצ' למתחילים",
    description: "קורס מקיף ללימוד יסודות המסחר האלגוריתמי באמצעות מערכת AlgoTouch. הקורס מכסה את כל הנושאים החיוניים להתחלת המסחר באמצעות אלגוריתמים, כולל התקנת המערכת והגדרות בסיסיות.",
    instructor: "דני אלוני",
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
    ]
  },
  "algotouch-advanced": {
    title: "הדרכה מקיפה למערכת TradeStation",
    description: "קורס עומק המכסה את כל היבטי מערכת TradeStation מסביבת העבודה ועד סורקי מניות, גרפים, ושליחת פקודות.",
    instructor: "מור כהן",
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
    ]
  },
  "market-analysis": {
    title: "מסחר בחוזים עתידיים",
    description: "קורס מקיף העוסק במסחר בחוזים עתידיים בבורסה האמריקאית, כולל סשנים, סימולים, פקיעות ובטחונות.",
    instructor: "רונית לוי",
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
    ]
  }
};

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const course = courseId ? mockCourseData[courseId as keyof typeof mockCourseData] : null;

  if (!course) {
    return (
      <Layout>
        <div className="tradervue-container py-8 animate-fade-in">
          <h1 className="text-3xl font-bold mb-6">קורס לא נמצא</h1>
          <Link to="/courses">
            <Button>חזרה לרשימת הקורסים</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const completedLessons = course.lessons.filter(lesson => lesson.completed).length;
  const progress = Math.round((completedLessons / course.lessons.length) * 100);

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
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

            <Tabs defaultValue="lessons">
              <TabsList>
                <TabsTrigger value="lessons">שיעורים</TabsTrigger>
                <TabsTrigger value="resources">חומרי עזר</TabsTrigger>
                <TabsTrigger value="notes">הערות</TabsTrigger>
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
                  <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600" 
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm mt-1">{completedLessons} מתוך {course.lessons.length} שיעורים הושלמו</p>
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
