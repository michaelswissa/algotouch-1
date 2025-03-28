
import React from 'react';

export type NewsItem = {
  id: number;
  title: string;
  time: string;
  source: string;
  url: string;
  description?: string;
};

// Simplified function to return placeholder news data
export async function fetchFinancialNews(): Promise<NewsItem[]> {
  console.info('Fetching financial news data (placeholder)...');
  
  // Return placeholder data with proper URLs
  const placeholderNews: NewsItem[] = [
    {
      id: 1,
      title: "וול סטריט נסגרה במגמה חיובית; מדד S&P 500 עלה ב-0.8%",
      time: `לפני ${Math.floor(Math.random() * 3) + 1} שעות`,
      source: "גלובס",
      description: "מדד S&P 500 הוסיף 0.8% ומדד הנאסד\"ק עלה ב-1.2%, על רקע ציפיות להורדת ריבית בספטמבר",
      url: "https://www.globes.co.il/news/"
    },
    {
      id: 2,
      title: "האינפלציה בארה\"ב נמוכה מהצפי: 3.2% בחודש מאי",
      time: `לפני ${Math.floor(Math.random() * 5) + 3} שעות`,
      source: "כלכליסט",
      description: "נתוני האינפלציה החדשים מגבירים את הסיכוי להורדת ריבית מוקדמת יותר השנה",
      url: "https://www.calcalist.co.il/"
    },
    {
      id: 3,
      title: "המשקיעים מצפים להורדת ריבית ראשונה בספטמבר",
      time: `לפני ${Math.floor(Math.random() * 3) + 6} שעות`,
      source: "TheMarker",
      description: "ההסתברות להורדת ריבית בספטמבר עלתה ל-75% לאחר פרסום נתוני האינפלציה האחרונים",
      url: "https://www.themarker.com/"
    },
    {
      id: 4,
      title: "אפל מציגה מוצרי AI חדשים, המניה עולה ב-3.5%",
      time: `לפני ${Math.floor(Math.random() * 4) + 8} שעות`,
      source: "מאקו",
      description: "באירוע המפתחים השנתי הציגה אפל את Apple Intelligence, מערכת AI חדשה שתשולב במכשירי החברה",
      url: "https://www.mako.co.il/"
    },
    {
      id: 5,
      title: "הבנק המרכזי האירופי הוריד את הריבית לראשונה מאז 2019",
      time: `לפני ${Math.floor(Math.random() * 2) + 12} שעות`,
      source: "גלובס",
      description: "ה-ECB הוריד את הריבית ב-0.25 נקודות אחוז לרמה של 3.75%, במטרה לעודד את הצמיחה באירופה",
      url: "https://www.globes.co.il/"
    }
  ];
  
  return placeholderNews;
}

// Hook to fetch and refresh news data
export function useNewsDataWithRefresh(refreshInterval = 60000) {
  const [newsData, setNewsData] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchFinancialNews();
        setNewsData(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError('Failed to fetch news data');
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

  return { newsData, loading, error, lastUpdated };
}
