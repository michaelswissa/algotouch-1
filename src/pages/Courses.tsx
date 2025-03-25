
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Play, 
  CheckCircle2, 
  Book, 
  BarChart4, 
  Award, 
  ArrowRight, 
  FileText, 
  ChevronLeft, 
  Lock, 
  Radio, 
  Calendar 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";

interface LessonProps {
  id: number;
  title: string;
  duration: string;
  completed: boolean;
  locked: boolean;
  description: string;
  videoUrl?: string;
}

interface QuizProps {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
}

interface CourseProps {
  id: string;
  title: string;
  description: string;
  image: string;
  instructor: string;
  lessons: LessonProps[];
  quizzes: QuizProps[];
  progress: number;
  discount?: {
    original: string;
    current: string;
    expiresIn: string;
  };
}

const CourseCard = ({ course, onClick }: { course: CourseProps; onClick: () => void }) => {
  return (
    <div
      className="h-full"
    >
      <Card className="h-full overflow-hidden bg-white/50 border border-gray-200 shadow-lg hover:shadow-xl transition-all">
        <div 
          className="h-40 bg-cover bg-center" 
          style={{ backgroundImage: `url(${course.image})` }}
        >
          {course.discount && (
            <div className="bg-red-500 text-white px-3 py-1 inline-block mr-auto mt-3 rounded-r-full">
              <span className="line-through opacity-75 mr-1">{course.discount.original}₪</span>
              <span className="font-bold">{course.discount.current}₪</span>
            </div>
          )}
        </div>
        <CardHeader className="pb-2">
          <CardTitle>{course.title}</CardTitle>
          <CardDescription className="flex items-center">
            <span className="ml-1">מדריך:</span> {course.instructor}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">{course.description}</p>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center text-sm text-gray-500">
              <Book className="h-4 w-4 ml-1" />
              <span>{course.lessons.length} שיעורים</span>
            </div>
            <div className="flex items-center text-sm text-gray-500">
              <CheckCircle2 className="h-4 w-4 ml-1" />
              <span>{course.lessons.filter(l => l.completed).length} הושלמו</span>
            </div>
          </div>
          <Progress value={course.progress} className="h-2" />
        </CardContent>
        <CardFooter className="flex justify-between">
          {course.discount && (
            <div className="text-xs text-gray-500 flex items-center">
              <Calendar className="h-3 w-3 ml-1" />
              מבצע מסתיים בעוד {course.discount.expiresIn}
            </div>
          )}
          <Button variant="ghost" className="ml-auto" onClick={onClick}>
            <span className="ml-1">להמשך הקורס</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const Lesson = ({ 
  lesson, 
  isActive, 
  onPlay, 
  onComplete 
}: { 
  lesson: LessonProps; 
  isActive: boolean; 
  onPlay: (lesson: LessonProps) => void;
  onComplete: (lessonId: number) => void;
}) => {
  return (
    <Card 
      className={`mb-3 transition-all ${
        isActive 
          ? 'border-[#0299FF] bg-blue-50/50' 
          : 'bg-white/50 border border-gray-200'
      } ${lesson.locked ? 'opacity-80' : ''}`}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center">
          {lesson.completed ? (
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-green-100 text-green-600 ml-4">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          ) : lesson.locked ? (
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-gray-100 text-gray-400 ml-4">
              <Lock className="h-5 w-5" />
            </div>
          ) : (
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-blue-100 text-[#0299FF] ml-4">
              <Radio className="h-5 w-5" />
            </div>
          )}
          
          <div>
            <h4 className={`font-medium ${lesson.locked ? 'text-gray-400' : ''}`}>{lesson.title}</h4>
            <p className="text-xs text-gray-500">{lesson.duration}</p>
          </div>
        </div>
        
        <div className="flex items-center">
          {!lesson.locked && (
            <>
              {!lesson.completed && (
                <Button variant="ghost" size="sm" className="mr-2" onClick={() => onComplete(lesson.id)}>
                  סמן כהושלם
                </Button>
              )}
              <Button 
                variant={isActive ? "default" : "outline"} 
                size="sm" 
                className={isActive ? "bg-[#0299FF] hover:bg-[#0288ee]" : ""} 
                onClick={() => onPlay(lesson)}
              >
                <Play className="h-4 w-4 ml-1" />
                {isActive ? 'כעת מנגן' : 'הפעל'}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const Quiz = ({ 
  quiz, 
  onSubmit 
}: { 
  quiz: QuizProps; 
  onSubmit: (quizId: number, selectedAnswer: number) => void;
}) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = () => {
    if (selectedOption !== null) {
      onSubmit(quiz.id, selectedOption);
      setSubmitted(true);
    }
  };
  
  return (
    <Card className="mb-6 bg-white/50 border border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">שאלה {quiz.id}</CardTitle>
        <CardDescription>{quiz.question}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {quiz.options.map((option, index) => (
            <div 
              key={index}
              className={`p-3 border rounded-md cursor-pointer transition-all ${
                selectedOption === index 
                  ? submitted 
                    ? index === quiz.correctAnswer 
                      ? 'bg-green-100 border-green-200' 
                      : 'bg-red-100 border-red-200'
                    : 'bg-blue-100 border-blue-200'
                  : 'bg-white hover:bg-gray-50'
              }`}
              onClick={() => !submitted && setSelectedOption(index)}
            >
              <div className="flex items-start">
                <div className="h-5 w-5 rounded-full bg-white text-xs flex items-center justify-center border ml-2">
                  {String.fromCharCode(65 + index)}
                </div>
                <div>{option}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter>
        {submitted ? (
          <div className={`text-sm ${selectedOption === quiz.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
            {selectedOption === quiz.correctAnswer 
              ? 'תשובה נכונה! כל הכבוד!' 
              : `תשובה שגויה. התשובה הנכונה היא: ${quiz.options[quiz.correctAnswer]}`
            }
          </div>
        ) : (
          <Button 
            onClick={handleSubmit} 
            disabled={selectedOption === null}
          >
            שלח תשובה
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

const CoursePage = ({ 
  course, 
  onBack 
}: { 
  course: CourseProps; 
  onBack: () => void;
}) => {
  const [activeLesson, setActiveLesson] = useState<LessonProps | null>(
    course.lessons.find(l => !l.completed && !l.locked) || course.lessons[0]
  );
  
  const handlePlayLesson = (lesson: LessonProps) => {
    setActiveLesson(lesson);
  };
  
  const handleCompleteLesson = (lessonId: number) => {
    toast({
      title: "השיעור סומן כהושלם",
      description: "ההתקדמות שלך נשמרה",
    });
  };
  
  const handleSubmitQuiz = (quizId: number, selectedAnswer: number) => {
    const quiz = course.quizzes.find(q => q.id === quizId);
    if (quiz) {
      if (selectedAnswer === quiz.correctAnswer) {
        toast({
          title: "תשובה נכונה!",
          description: "כל הכבוד! המשך כך.",
          variant: "default",
        });
      } else {
        toast({
          title: "תשובה שגויה",
          description: "נסה שוב או המשך ללמוד את החומר.",
          variant: "destructive",
        });
      }
    }
  };
  
  return (
    <div className="container mx-auto">
      <button 
        className="flex items-center mb-4 text-[#0299FF] hover:underline"
        onClick={onBack}
      >
        <ChevronLeft className="h-4 w-4 ml-1" />
        חזרה לכל הקורסים
      </button>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <Card className="mb-6 bg-white/50 border border-gray-200 shadow-lg">
            <CardHeader>
              <CardTitle>{course.title}</CardTitle>
              <CardDescription>
                <div className="flex items-center">
                  <span className="ml-1">מדריך:</span> {course.instructor}
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeLesson && (
                <div className="aspect-video bg-gray-900 rounded-md mb-4 overflow-hidden">
                  {activeLesson.videoUrl ? (
                    <iframe 
                      width="100%" 
                      height="100%" 
                      src={activeLesson.videoUrl}
                      title={activeLesson.title}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="h-full flex items-center justify-center bg-gray-800 text-white">
                      <div className="text-center">
                        <Play className="h-12 w-12 mx-auto mb-2 opacity-60" />
                        <h3 className="text-xl font-medium mb-1">{activeLesson.title}</h3>
                        <p className="text-gray-400">{activeLesson.description}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div>
                <h3 className="text-xl font-medium mb-3">{activeLesson?.title}</h3>
                <p className="text-gray-600">{activeLesson?.description}</p>
              </div>
            </CardContent>
          </Card>
          
          <Tabs defaultValue="content" className="mb-6">
            <TabsList className="mb-4">
              <TabsTrigger value="content">תוכן הקורס</TabsTrigger>
              <TabsTrigger value="quizzes">מבחנים ותרגילים</TabsTrigger>
              <TabsTrigger value="resources">חומרי עזר</TabsTrigger>
            </TabsList>
            
            <TabsContent value="content" className="space-y-2">
              <div className="mb-4">
                <h3 className="text-lg font-medium mb-2">שיעורים</h3>
                <Progress value={course.progress} className="h-2 mb-2" />
                <div className="text-sm text-gray-500 mb-4">
                  {course.lessons.filter(l => l.completed).length} מתוך {course.lessons.length} שיעורים הושלמו ({course.progress}%)
                </div>
              </div>
              
              {course.lessons.map((lesson) => (
                <Lesson 
                  key={lesson.id} 
                  lesson={lesson} 
                  isActive={activeLesson?.id === lesson.id}
                  onPlay={handlePlayLesson}
                  onComplete={handleCompleteLesson}
                />
              ))}
            </TabsContent>
            
            <TabsContent value="quizzes">
              <h3 className="text-lg font-medium mb-4">מבחנים ותרגילים</h3>
              {course.quizzes.map((quiz) => (
                <Quiz 
                  key={quiz.id} 
                  quiz={quiz} 
                  onSubmit={handleSubmitQuiz}
                />
              ))}
            </TabsContent>
            
            <TabsContent value="resources">
              <h3 className="text-lg font-medium mb-4">חומרי עזר</h3>
              <div className="space-y-3">
                <Card className="bg-white/50 border border-gray-200">
                  <CardContent className="p-4 flex items-center">
                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-[#0299FF] ml-4">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">מדריך מפורט לשימוש במערכת - PDF</h4>
                      <p className="text-sm text-gray-500">מדריך מקיף עם כל הפקודות והתכונות</p>
                    </div>
                    <Button variant="outline" size="sm">
                      הורדה
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/50 border border-gray-200">
                  <CardContent className="p-4 flex items-center">
                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-[#0299FF] ml-4">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">טבלת סימולים למסחר - Excel</h4>
                      <p className="text-sm text-gray-500">רשימה מלאה של סימולים לכל המכשירים הפיננסיים</p>
                    </div>
                    <Button variant="outline" size="sm">
                      הורדה
                    </Button>
                  </CardContent>
                </Card>
                
                <Card className="bg-white/50 border border-gray-200">
                  <CardContent className="p-4 flex items-center">
                    <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-[#0299FF] ml-4">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">תבניות אסטרטגיה מוכנות - ZIP</h4>
                      <p className="text-sm text-gray-500">אוסף של אסטרטגיות מנצחות לשימוש מיידי</p>
                    </div>
                    <Button variant="outline" size="sm">
                      הורדה
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
        
        <div>
          <Card className="mb-6 bg-white/50 border border-gray-200 shadow-lg sticky top-24">
            <CardHeader>
              <CardTitle>התקדמות הקורס</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <Progress value={course.progress} className="h-2 mb-2" />
                <div className="text-sm text-gray-500">
                  {course.lessons.filter(l => l.completed).length} מתוך {course.lessons.length} שיעורים הושלמו
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[#0299FF] ml-3">
                    <Book className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">שיעורים</div>
                    <div className="text-xs text-gray-500">{course.lessons.length} שיעורים בקורס</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[#0299FF] ml-3">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">מבחנים</div>
                    <div className="text-xs text-gray-500">{course.quizzes.length} מבחנים בקורס</div>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-[#0299FF] ml-3">
                    <Award className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">תעודה</div>
                    <div className="text-xs text-gray-500">תקבל בסיום הקורס</div>
                  </div>
                </div>
              </div>
              
              {course.discount && (
                <div className="mt-6 p-4 bg-red-50 rounded-md border border-red-100">
                  <div className="text-red-800 font-medium mb-1">מבצע מיוחד!</div>
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="line-through opacity-75 text-gray-500 mr-1">{course.discount.original}₪</span>
                      <span className="font-bold text-lg">{course.discount.current}₪</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      מסתיים בעוד {course.discount.expiresIn}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const Courses = () => {
  const [selectedCourse, setSelectedCourse] = useState<CourseProps | null>(null);
  
  const courses: CourseProps[] = [
    {
      id: "algotouch-basics",
      title: "קורס אלגוטאצ' למתחילים",
      description: "לימוד שיטתי של מערכת אלגוטאצ' הכולל פתיחת חשבון, הגדרת המערכת, תפעול ומסחר, ועד ניהול כספים ומיסוי.",
      image: "https://images.unsplash.com/photo-1642790551116-18e150f248e9?q=80&w=2940&auto=format&fit=crop",
      instructor: "דני אלוני",
      progress: 30,
      lessons: [
        {
          id: 1,
          title: "פתיחת חשבון ב-TradeStation",
          duration: "45 דקות",
          completed: true,
          locked: false,
          description: "בשיעור זה נלמד כיצד לפתוח חשבון מסחר בפלטפורמת TradeStation, כולל הרשמה, העברת כספים ומילוי טפסים."
        },
        {
          id: 2,
          title: "הגדרת מערכת אלגוטאצ'",
          duration: "35 דקות",
          completed: true,
          locked: false,
          description: "נלמד כיצד לבקש גישה למערכת, להתקין אותה ולחבר אותה לחשבון המסחר שלך ב-TradeStation."
        },
        {
          id: 3,
          title: "תפעול ומסחר במערכת",
          duration: "50 דקות",
          completed: false,
          locked: false,
          description: "נלמד על בחירת נכס למסחר, הגדרת פרקי זמן, רמות תמיכה והתנגדות, וכפתורי הפעלה בסיסיים."
        },
        {
          id: 4,
          title: "ניהול ומעקב שוטף",
          duration: "40 דקות",
          completed: false,
          locked: false,
          description: "נלמד על חוקים להצלחה במסחר והדרך למסחר יציב ורווחי, וכיצד להוציא דו\"ח עסקאות במערכת."
        },
        {
          id: 5,
          title: "משיכת כספים",
          duration: "25 דקות",
          completed: false,
          locked: true,
          description: "נלמד על תהליך משיכת כספים מ-TradeStation לחשבון הבנק שלך."
        },
        {
          id: 6,
          title: "מיסוי",
          duration: "30 דקות",
          completed: false,
          locked: true,
          description: "נלמד על נקודות חשובות בהקשר למיסוי רווחים מהמסחר וחישוב מס ורווחים נטו."
        },
        {
          id: 7,
          title: "קבלת תמיכה",
          duration: "20 דקות",
          completed: false,
          locked: true,
          description: "נלמד איך ליצור קשר עם התמיכה של אלגוטאצ'."
        }
      ],
      quizzes: [
        {
          id: 1,
          question: "מהו היתרון העיקרי של מסחר אלגוריתמי על פני מסחר ידני?",
          options: [
            "יותר זול",
            "פחות עמלות",
            "סילוק הגורם הרגשי מההחלטות",
            "יותר וולומים"
          ],
          correctAnswer: 2
        },
        {
          id: 2,
          question: "איזה חשבון מסחר נדרש כדי להשתמש במערכת AlgoTouch?",
          options: [
            "InteractiveBrokers",
            "TradeStation",
            "TD Ameritrade",
            "eToro"
          ],
          correctAnswer: 1
        }
      ],
      discount: {
        original: "1,997",
        current: "997",
        expiresIn: "2 ימים"
      }
    },
    {
      id: "tradestation-guide",
      title: "הדרכה מקיפה למערכת TradeStation",
      description: "קורס עומק המכסה את כל היבטי מערכת TradeStation מסביבת העבודה ועד סורקי מניות, גרפים, ושליחת פקודות.",
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop",
      instructor: "מור כהן",
      progress: 0,
      lessons: [
        {
          id: 1,
          title: "הדרכת מתחילים למערכת מסחר TradeStation",
          duration: "1:25:56",
          completed: false,
          locked: false,
          description: "הדרכה מקיפה למתחילים על מערכת TradeStation, כולל הסבר על כל הכלים והתכונות הבסיסיות."
        },
        {
          id: 2,
          title: "תחילת העבודה עם חשבון החוזים העתידיים",
          duration: "9:35",
          completed: false,
          locked: false,
          description: "הסבר מפורט על חשבון חוזים עתידיים ואיך להתחיל לעבוד איתו במערכת TradeStation."
        },
        {
          id: 3,
          title: "סביבת עבודה",
          duration: "6:50",
          completed: false,
          locked: true,
          description: "הסבר על סביבת העבודה של מערכת TradeStation והיכרות עם הממשק."
        },
        {
          id: 4,
          title: "ניהול חשבון",
          duration: "11:56",
          completed: false,
          locked: true,
          description: "הסבר על ניהול החשבון במערכת TradeStation, כולל בקרת הוצאות ומעקב אחר הביצועים."
        },
        {
          id: 5,
          title: "היכרות עם הגרפים",
          duration: "10:04",
          completed: false,
          locked: true,
          description: "הסבר מפורט על גרפים במערכת TradeStation ואיך לנתח אותם."
        },
        {
          id: 6,
          title: "סורק המניות עטור הפרסים Radar Screen",
          duration: "6:54",
          completed: false,
          locked: true,
          description: "הסבר על סורק המניות Radar Screen ואיך להשתמש בו לזיהוי הזדמנויות."
        },
        {
          id: 7,
          title: "סורקי מניות ורשימות חמות",
          duration: "7:40",
          completed: false,
          locked: true,
          description: "הסבר על סורקי מניות נוספים ורשימות חמות במערכת TradeStation."
        },
        {
          id: 8,
          title: "אפשרויות שליחת פקודות",
          duration: "17:48",
          completed: false,
          locked: true,
          description: "הסבר מקיף על אפשרויות שליחת פקודות במערכת TradeStation."
        },
        {
          id: 9,
          title: "סטופ לוס וטייק פרופיט",
          duration: "17:32",
          completed: false,
          locked: true,
          description: "הסבר על סטופ לוס וטייק פרופיט במערכת TradeStation."
        },
        {
          id: 10,
          title: "הכרת המטריקס: ניתוח עומק השוק בזמן אמת",
          duration: "11:49",
          completed: false,
          locked: true,
          description: "הסבר על המטריקס וניתוח עומק השוק בזמן אמת במערכת TradeStation."
        }
      ],
      quizzes: [
        {
          id: 1,
          question: "איזו מהבאות אינה תכונה של מערכת TradeStation?",
          options: [
            "Radar Screen",
            "Matrix (עומק שוק)",
            "גרפים מתקדמים",
            "מסחר על בורסת NFT"
          ],
          correctAnswer: 3
        }
      ]
    },
    {
      id: "futures-trading",
      title: "מסחר בחוזים עתידיים",
      description: "קורס מקיף העוסק במסחר בחוזים עתידיים בבורסה האמריקאית, כולל סשנים, סימולים, פקיעות ובטחונות.",
      image: "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?q=80&w=2070&auto=format&fit=crop",
      instructor: "רונית לוי",
      progress: 80,
      lessons: [
        {
          id: 1,
          title: "פתיח",
          duration: "1:49",
          completed: true,
          locked: false,
          description: "הקדמה לקורס מסחר בחוזים עתידיים ומה נלמד בקורס."
        },
        {
          id: 2,
          title: "פעילות החוזים העתידיים הפופולרים",
          duration: "2:43",
          completed: true,
          locked: false,
          description: "סקירה של החוזים העתידיים הפופולריים ביותר בשוק האמריקאי."
        },
        {
          id: 3,
          title: "3 הסשנים העיקריים למסחר בבורסה האמריקאית",
          duration: "3:38",
          completed: true,
          locked: false,
          description: "הסבר על 3 הסשנים העיקריים למסחר בבורסה האמריקאית ומתי כדאי לסחור."
        },
        {
          id: 4,
          title: "סימולים פקיעות ושווי נכסים",
          duration: "11:31",
          completed: true,
          locked: false,
          description: "הסבר על סימולים, פקיעות ושווי נכסים בחוזים עתידיים."
        },
        {
          id: 5,
          title: "בטחונות",
          duration: "5:48",
          completed: false,
          locked: false,
          description: "הסבר על בטחונות בחוזים עתידיים וכיצד לחשב אותם."
        },
        {
          id: 6,
          title: "הזדמנות בחוזי המיקרו",
          duration: "4:09",
          completed: false,
          locked: false,
          description: "הסבר על חוזי המיקרו וההזדמנויות הטמונות בהם.",
          isNew: true
        }
      ],
      quizzes: [
        {
          id: 1,
          question: "מה מבין הבאים הוא חוזה עתידי פופולרי?",
          options: [
            "SPX",
            "ES (S&P 500 E-mini)",
            "VIX",
            "QQQ"
          ],
          correctAnswer: 1
        },
        {
          id: 2,
          question: "מהו יתרון משמעותי של חוזי המיקרו?",
          options: [
            "נזילות גבוהה יותר",
            "פחות תנודתיות",
            "דרישת בטחונות נמוכה יותר",
            "פקיעה ארוכה יותר"
          ],
          correctAnswer: 2
        }
      ],
      discount: {
        original: "1,497",
        current: "997",
        expiresIn: "5 ימים"
      }
    }
  ];
  
  const handleBackToCoursesClick = () => {
    setSelectedCourse(null);
  };
  
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        {!selectedCourse ? (
          <div>
            <h1 className="text-3xl font-bold mb-6">קורסים דיגיטליים</h1>
            <p className="text-lg text-gray-600 max-w-3xl mb-8">
              למד כיצד למקסם את היכולות שלך במסחר אלגוריתמי עם מערכת AlgoTouch.AI
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course, index) => (
                <CourseCard 
                  key={course.id} 
                  course={course} 
                  onClick={() => setSelectedCourse(course)} 
                />
              ))}
            </div>
          </div>
        ) : (
          <CoursePage 
            course={selectedCourse} 
            onBack={handleBackToCoursesClick} 
          />
        )}
      </div>
    </Layout>
  );
};

export default Courses;
