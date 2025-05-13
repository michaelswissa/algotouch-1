
import React, { useState, useEffect } from 'react';

// Blog posts with images using paths to the uploaded images
export function useBlogPostsWithRefresh(refreshInterval = 120000) {
  const [blogPosts, setBlogPosts] = useState<any[]>([
    {
      id: 1,
      title: "הדרכה מקיפה למערכת TradeStation",
      excerpt: "במאמר זה נסקור את מערכת TradeStation, כלי חשוב עבור סוחרים מקצועיים, ונדון ביתרונות ובחסרונות שלה.",
      content: "לורם איפסום...",
      date: "27.03.2025",
      author: "יובל לוי",
      tags: ["מערכות מסחר", "כלים"],
      coverImage: "/lovable-uploads/eaaedceb-e362-4bfa-b236-a73f5544c6f3.png"  // תמונת הרובוט בחלון עם שולחן וWall St
    },
    {
      id: 2,
      title: "אסטרטגיות מסחר יומי בשוק האמריקאי",
      excerpt: "הכירו את האסטרטגיות המובילות למסחר יומי בשוק המניות האמריקאי, כולל טכניקות מעשיות ודוגמאות.",
      content: "לורם איפסום...",
      date: "25.03.2025",
      author: "שרה כהן",
      tags: ["אסטרטגיות", "שוק אמריקאי"],
      coverImage: "/lovable-uploads/c329da61-ad36-468f-bd33-878ec966c5a8.png"  // תמונת הרובוט עם סימן שאלה וגרף
    },
    {
      id: 3,
      title: "ניהול סיכונים בשוק ההון - המדריך המלא",
      excerpt: "כיצד לנהל סיכונים באופן אפקטיבי בשוק ההון? במאמר זה נלמד על הכלים והשיטות להגנה על ההון שלכם.",
      content: "לורם איפסום...",
      date: "22.03.2025",
      author: "דן אברהם",
      tags: ["ניהול סיכונים", "הדרכה"],
      coverImage: "/lovable-uploads/fab3481d-e54b-40ba-8173-ca15a5739a3a.png"  // תמונת הרובוט המנצח עם גביע ומטבעות
    },
    {
      id: 4,
      title: "מגמות טכנולוגיות בשוק ההון לשנת 2025",
      excerpt: "סקירה של הטכנולוגיות החדשות המשפיעות על שוק ההון ב-2025, כולל בינה מלאכותית ובלוקצ'יין.",
      content: "לורם איפסום...",
      date: "20.03.2025",
      author: "נועה שטרן",
      tags: ["טכנולוגיה", "מגמות"],
      coverImage: "/images/stock-market-4.jpg"
    },
    {
      id: 5,
      title: "השקעות ארוכות טווח - איך לבנות תיק מנצח",
      excerpt: "מדריך מעשי לבניית תיק השקעות ארוך טווח, עם דגש על גיוון, ניהול סיכונים וצמיחה יציבה.",
      content: "לורם איפסום...",
      date: "18.03.2025",
      author: "אריאל לוין",
      tags: ["השקעות", "תיק השקעות"],
      coverImage: "/images/stock-market-5.jpg"
    },
    {
      id: 6,
      title: "המדריך לקריאת דוחות כספיים של חברות",
      excerpt: "כיצד לנתח דוחות כספיים של חברות ציבוריות ולהפוך את המספרים להחלטות השקעה חכמות.",
      content: "לורם איפסום...",
      date: "15.03.2025",
      author: "חן גולדברג",
      tags: ["ניתוח", "דוחות כספיים"],
      coverImage: "/images/stock-market-6.jpg"
    }
  ]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    // Simulate loading
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setLastUpdated(new Date());
    }, 500);

    // Refresh data at intervals
    const intervalId = setInterval(() => {
      setLastUpdated(new Date());
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  return { blogPosts, loading, error, lastUpdated };
}
