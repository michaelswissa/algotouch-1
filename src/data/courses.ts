
import { CourseProps } from '@/components/CourseCard';

export const coursesData: CourseProps[] = [
  {
    id: "algo-trading-basics",
    title: "יסודות מסחר אלגוריתמי",
    description: "קורס מקיף לבניית אסטרטגיות מסחר אלגוריתמיות",
    instructor: "יוסי כהן",
    duration: "12 שעות",
    level: "מתחילים",
    students: 423,
    rating: 4.8,
    imagePath: "/lovable-uploads/course-thumbnail.jpg",
    modules: [
      { title: "מבוא למסחר אלגוריתמי", duration: "2 שעות", details: "הכרת עקרונות בסיסיים" },
      { title: "ניתוח נתונים היסטוריים", duration: "3 שעות", details: "עיבוד וניתוח דאטה לצורך פיתוח אלגוריתמים" },
      { title: "בניית אסטרטגיה ראשונה", duration: "4 שעות", details: "פיתוח אלגוריתם מסחר בסיסי" },
      { title: "אופטימיזציה ובדיקות", duration: "3 שעות", details: "שיפור ביצועים ומניעת אוברפיטינג", isNew: true }
    ]
  },
  {
    id: "risk-management",
    title: "ניהול סיכונים במסחר",
    description: "שיטות מתקדמות לניהול סיכונים אפקטיבי בשוק ההון",
    instructor: "רונית לוי",
    duration: "8 שעות",
    level: "מתקדם",
    students: 285,
    rating: 4.6,
    imagePath: "/lovable-uploads/fab3481d-e54b-40ba-8173-ca15a5739a3a.png",
    modules: [
      { title: "עקרונות ניהול סיכונים", duration: "2 שעות" },
      { title: "גידור פוזיציות", duration: "2 שעות" },
      { title: "אסטרטגיות הגנה", duration: "2 שעות" },
      { title: "ניתוח תרחישי קיצון", duration: "2 שעות" }
    ]
  },
  {
    id: "market-analysis",
    title: "ניתוח שוק מתקדם",
    description: "טכניקות מתקדמות לניתוח מגמות שוק וזיהוי הזדמנויות",
    instructor: "אלכס ברגר",
    duration: "10 שעות",
    level: "מתקדם",
    students: 347,
    rating: 4.7,
    imagePath: "/lovable-uploads/eaaedceb-e362-4bfa-b236-a73f5544c6f3.png",
    modules: [
      { title: "ניתוח טכני מתקדם", duration: "3 שעות" },
      { title: "זיהוי מגמות מאקרו", duration: "3 שעות" },
      { title: "ניתוח סנטימנט", duration: "2 שעות" },
      { title: "אינטגרציה של מקורות מידע", duration: "2 שעות", isNew: true }
    ]
  }
];
