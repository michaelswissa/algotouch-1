
import React from 'react';
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
    <div className="h-full">
      <Card className="h-full overflow-hidden backdrop-blur-sm bg-white/50 dark:bg-gray-900/50 border border-white/20 dark:border-gray-800/30 shadow-lg hover:shadow-xl transition-all">
        <div 
          className="h-40 bg-cover bg-center" 
          style={{ backgroundImage: `url(${course.image})` }}
        >
          {course.discount && (
            <div className="bg-red-500 text-white px-3 py-1 inline-block mr-auto mt-3 rounded-r-full">
              <span className="font-bold">{course.discount.current}</span>
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
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 mb-4">{course.description}</p>
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Book className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
              <span>{course.lessons.length} שיעורים</span>
            </div>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <CheckCircle2 className="h-4 w-4 ml-1 rtl:mr-1 rtl:ml-0" />
              <span>{course.lessons.filter(l => l.completed).length} הושלמו</span>
            </div>
          </div>
          <Progress value={course.progress} className="h-2" />
        </CardContent>
        <CardFooter className="flex justify-between">
          {course.discount && (
            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
              <Calendar className="h-3 w-3 ml-1 rtl:mr-1 rtl:ml-0" />
              מבצע מסתיים בעוד {course.discount.expiresIn}
            </div>
          )}
          <Button variant="ghost" className="ml-auto" onClick={onClick}>
            <span className="ml-1 rtl:mr-1 rtl:ml-0">להמשך הקורס</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

const Courses = () => {
  const courses: CourseProps[] = [
    {
      id: "algotouch-basics",
      title: "יסודות AlgoTouch",
      description: "קורס מקיף ללימוד יסודות המסחר האלגוריתמי באמצעות מערכת AlgoTouch. הקורס מכסה את כל הנושאים החיוניים להתחלת המסחר באמצעות אלגוריתמים, כולל התקנת המערכת והגדרות בסיסיות.",
      image: "https://images.unsplash.com/photo-1642790551116-18e150f248e9?q=80&w=2940&auto=format&fit=crop",
      instructor: "דני אלוני",
      progress: 30,
      lessons: [
        {
          id: 1,
          title: "מבוא למסחר אלגוריתמי",
          duration: "45 דקות",
          completed: true,
          locked: false,
          description: "בשיעור זה נלמד על יסודות המסחר האלגוריתמי ומדוע הוא יעיל יותר ממסחר ידני. נכיר את התשתית שעליה בנויה מערכת AlgoTouch."
        },
        {
          id: 2,
          title: "התקנת וחיבור המערכת",
          duration: "35 דקות",
          completed: true,
          locked: false,
          description: "נלמד כיצד להתקין ולהגדיר את מערכת AlgoTouch בצורה נכונה, כולל חיבור לחשבון המסחר ופלטפורמת TradeStation."
        },
        {
          id: 3,
          title: "ממשק המשתמש",
          duration: "50 דקות",
          completed: false,
          locked: false,
          description: "סקירה מקיפה של ממשק המשתמש והכרת כל אלמנט בתצוגה, כולל גרפים, לוח הפקודות והגדרות."
        },
        {
          id: 4,
          title: "הגדרת רמות מחיר",
          duration: "55 דקות",
          completed: false,
          locked: false,
          description: "נלמד כיצד לזהות ולהגדיר רמות מחיר חשובות במערכת, כולל רמות תמיכה והתנגדות."
        },
        {
          id: 5,
          title: "הגדרות בסיסיות",
          duration: "40 דקות",
          completed: false,
          locked: true,
          description: "נלמד להגדיר את הפרמטרים הבסיסיים של המערכת, כולל גודל פוזיציה, סטופ-לוס ויעדי רווח."
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
      id: "algotouch-advanced",
      title: "אסטרטגיות מסחר מתקדמות",
      description: "קורס מעמיק לסוחרים שכבר מכירים את הבסיס. נלמד אסטרטגיות מסחר מתקדמות, ניהול סיכונים מתקדם וטכניקות אופטימיזציה שיעזרו לכם לשפר את ביצועי המסחר שלכם.",
      image: "https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?q=80&w=2070&auto=format&fit=crop",
      instructor: "מור כהן",
      progress: 0,
      lessons: [
        {
          id: 1,
          title: "אסטרטגיות מסחר באזורי תנודה",
          duration: "60 דקות",
          completed: false,
          locked: false,
          description: "בשיעור זה נלמד כיצד לזהות ולמנף אזורי תנודה לביצוע עסקאות רווחיות באמצעות מערכת AlgoTouch."
        },
        {
          id: 2,
          title: "אסטרטגיות מגמה",
          duration: "55 דקות",
          completed: false,
          locked: false,
          description: "נלמד כיצד לזהות ולמנף מגמות שוק חזקות לביצוע עסקאות בכיוון המגמה, תוך שימוש בכלים המתקדמים של המערכת."
        },
        {
          id: 3,
          title: "ניהול סיכונים מתקדם",
          duration: "65 דקות",
          completed: false,
          locked: true,
          description: "שיטות מתקדמות לניהול סיכונים, כולל הגדרת סטופים דינמיים, טריילינג סטופ וחלוקת הפוזיציה ליעדים מרובים."
        },
        {
          id: 4,
          title: "אופטימיזציה של אסטרטגיות",
          duration: "70 דקות",
          completed: false,
          locked: true,
          description: "כיצד לנתח ולשפר את ביצועי האסטרטגיות שלך באמצעות כלי האופטימיזציה של AlgoTouch."
        },
        {
          id: 5,
          title: "אסטרטגיות סקאלפינג",
          duration: "50 דקות",
          completed: false,
          locked: true,
          description: "אסטרטגיות למסחר מהיר וקצר טווח באמצעות מערכת AlgoTouch."
        }
      ],
      quizzes: [
        {
          id: 1,
          question: "איזו מהבאות אינה אסטרטגיית מסחר באזורי תנודה?",
          options: [
            "קנייה בתמיכה ומכירה בהתנגדות",
            "פריצת טווח מסחר",
            "מסחר באמצעות רמות פיבונאצ'י",
            "מסחר בכיוון המגמה"
          ],
          correctAnswer: 3
        },
        {
          id: 2,
          question: "מהו Trailing Stop?",
          options: [
            "סטופ קבוע שלא משתנה",
            "סטופ שזז בכיוון העסקה כשהיא ברווח",
            "סטופ שמתבטל אוטומטית אחרי זמן מסוים",
            "סטופ שמעולם לא מופעל"
          ],
          correctAnswer: 1
        }
      ]
    },
    {
      id: "market-analysis",
      title: "ניתוח שווקים פיננסיים",
      description: "קורס מקיף לניתוח שווקים פיננסיים, המתמקד בטכניקות ניתוח טכני ויסודי. הקורס יעזור לכם לבחור את הנכסים המתאימים למסחר ולזהות נקודות כניסה ויציאה אופטימליות.",
      image: "https://images.unsplash.com/photo-1569025690938-a00729c9e1f9?q=80&w=2070&auto=format&fit=crop",
      instructor: "רונית לוי",
      progress: 80,
      lessons: [
        {
          id: 1,
          title: "יסודות הניתוח הטכני",
          duration: "55 דקות",
          completed: true,
          locked: false,
          description: "בשיעור זה נכיר את מושגי היסוד של הניתוח הטכני, כולל תבניות נרות, מתנדים ותבניות מחיר."
        },
        {
          id: 2,
          title: "זיהוי מגמות ונקודות מפנה",
          duration: "60 דקות",
          completed: true,
          locked: false,
          description: "כיצד לזהות מגמות בשוק ונקודות מפנה פוטנציאליות באמצעות כלים טכניים."
        },
        {
          id: 3,
          title: "ניתוח רב-מסגרת זמן",
          duration: "50 דקות",
          completed: true,
          locked: false,
          description: "שיטות לניתוח השוק במסגרות זמן שונות כדי לקבל תמונה מקיפה יותר של השוק."
        },
        {
          id: 4,
          title: "אינדיקטורים מתקדמים",
          duration: "65 דקות",
          completed: true,
          locked: false,
          description: "שימוש באינדיקטורים מתקדמים לניתוח שווקים, כולל MACD, RSI, Bollinger Bands ועוד."
        },
        {
          id: 5,
          title: "שילוב ניתוח פונדמנטלי",
          duration: "70 דקות",
          completed: false,
          locked: false,
          description: "כיצד לשלב ניתוח פונדמנטלי בתהליך קבלת ההחלטות שלך."
        }
      ],
      quizzes: [
        {
          id: 1,
          question: "איזה מהבאים אינו אינדיקטור לניתוח טכני?",
          options: [
            "RSI (מדד החוזק היחסי)",
            "MACD (התכנסות/התבדרות ממוצעים נעים)",
            "P/E (יחס מחיר לרווח)",
            "Bollinger Bands (רצועות בולינגר)"
          ],
          correctAnswer: 2
        },
        {
          id: 2,
          question: "מהי תבנית \"ראש וכתפיים\"?",
          options: [
            "תבנית המשך מגמה",
            "תבנית היפוך מגמה",
            "תבנית ניטרלית",
            "אין תבנית כזו בניתוח טכני"
          ],
          correctAnswer: 1
        }
      ],
      discount: {
        original: "1,497",
        current: "997",
        expiresIn: "5 ימים"
      }
    }
  ];

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">קורסים</h1>
        
        <div className="mb-8">
          <p className="text-lg text-gray-600">
            הקורסים הדיגיטליים שלנו מיועדים לעזור לך להפוך למומחה במסחר באמצעות מערכת AlgoTouch.AI. 
            כל קורס מכיל מגוון שיעורים, תרגולים ומשאבים שיעזרו לך להתקדם בקצב שלך.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {courses.map((course, index) => (
            <CourseCard key={index} course={course} onClick={() => console.log('קורס נבחר:', course.id)} />
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Courses;
