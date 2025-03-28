
import React from 'react';

export type BlogPost = {
  id: number;
  title: string;
  date: string;
  author: string;
  excerpt: string;
  coverImage: string;
  tags: string[];
  url: string;
};

// Function to fetch blog posts (placeholder for now)
export async function fetchBlogPosts(): Promise<BlogPost[]> {
  console.info('Fetching blog posts (placeholder)...');
  
  // Return placeholder blog posts
  const placeholderBlogPosts: BlogPost[] = [
    {
      id: 1,
      title: "איך לנהל את התיק השקעות שלך בתקופת אינפלציה",
      date: "12 ביוני 2023",
      author: "יובל כהן",
      excerpt: "לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית קולהע צופעט למרקוח איבן איף, ברומץ כלרשט מיחוצים.",
      coverImage: "/placeholder.svg",
      tags: ["תיק השקעות", "אינפלציה", "ניהול סיכונים"],
      url: "/blog/1"
    },
    {
      id: 2,
      title: "5 אסטרטגיות מסחר שכדאי להכיר",
      date: "5 ביוני 2023",
      author: "מיכל לוי",
      excerpt: "לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית. סת אלמנקום ניסי נון ניבאה. דס איאקוליס וולופטה דיאם.",
      coverImage: "/placeholder.svg",
      tags: ["אסטרטגיות מסחר", "דיי טריידינג", "ניתוח טכני"],
      url: "/blog/2"
    },
    {
      id: 3,
      title: "מדריך למתחילים: איך להתחיל לסחור בבורסה",
      date: "28 במאי 2023",
      author: "אלון דוד",
      excerpt: "לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית. סת אלמנקום ניסי נון ניבאה. דס איאקוליס וולופטה דיאם.",
      coverImage: "/placeholder.svg",
      tags: ["מדריך למתחילים", "בורסה", "השקעות"],
      url: "/blog/3"
    },
    {
      id: 4,
      title: "מה ההבדל בין מסחר יומי למסחר סווינג",
      date: "21 במאי 2023",
      author: "שירה אברהם",
      excerpt: "לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית קולהע צופעט למרקוח איבן איף, ברומץ כלרשט מיחוצים.",
      coverImage: "/placeholder.svg",
      tags: ["מסחר יומי", "סווינג", "אסטרטגיות"],
      url: "/blog/4"
    },
    {
      id: 5,
      title: "טיפים לניהול יומן מסחר אפקטיבי",
      date: "14 במאי 2023",
      author: "רונן לוי",
      excerpt: "לורם איפסום דולור סיט אמט, קונסקטורר אדיפיסינג אלית. סת אלמנקום ניסי נון ניבאה. דס איאקוליס וולופטה דיאם.",
      coverImage: "/placeholder.svg",
      tags: ["יומן מסחר", "ניתוח", "שיפור ביצועים"],
      url: "/blog/5"
    }
  ];
  
  return placeholderBlogPosts;
}

// Hook to fetch and refresh blog posts
export function useBlogPostsWithRefresh(refreshInterval = 300000) { // 5 minutes
  const [blogPosts, setBlogPosts] = React.useState<BlogPost[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchBlogPosts();
        setBlogPosts(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError('Failed to fetch blog posts');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for refreshing data
    const intervalId = setInterval(fetchData, refreshInterval);

    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, [refreshInterval]);

  return { blogPosts, loading, error, lastUpdated };
}
