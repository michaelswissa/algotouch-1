
import React from 'react';

export type NewsItem = {
  id: number;
  title: string;
  time: string;
  source: string;
  url?: string;
};

// Function to fetch financial news
export async function fetchFinancialNews(): Promise<NewsItem[]> {
  try {
    // In a real-world scenario, we would fetch from an actual news API
    // For this demo, we'll use simulated data with more realistic content
    
    const currentTime = new Date();
    
    const simulatedNews: NewsItem[] = [
      {
        id: 1,
        title: "וול סטריט נסגרה במגמה חיובית; S&P 500 עלה ב-0.8%",
        time: `לפני ${Math.floor(Math.random() * 3) + 1} שעות`,
        source: "גלובס",
        url: "https://www.globes.co.il"
      },
      {
        id: 2,
        title: "האינפלציה בארה\"ב נמוכה מהצפי: 3.2% בחודש מאי",
        time: `לפני ${Math.floor(Math.random() * 5) + 3} שעות`,
        source: "כלכליסט",
        url: "https://www.calcalist.co.il"
      },
      {
        id: 3,
        title: "המשקיעים מצפים להורדת ריבית ראשונה בספטמבר",
        time: `לפני ${Math.floor(Math.random() * 3) + 6} שעות`,
        source: "TheMarker",
        url: "https://www.themarker.com"
      },
      {
        id: 4,
        title: "אפל מציגה מוצרי AI חדשים, המניה עולה ב-3.5%",
        time: `לפני ${Math.floor(Math.random() * 4) + 8} שעות`,
        source: "מרקר",
        url: "https://www.themarker.com"
      },
      {
        id: 5,
        title: "הבנק המרכזי האירופי הוריד את הריבית לראשונה מאז 2019",
        time: `לפני ${Math.floor(Math.random() * 2) + 12} שעות`,
        source: "גלובס",
        url: "https://www.globes.co.il"
      }
    ];
    
    return simulatedNews;
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

// Hook to fetch and refresh news data
export function useNewsDataWithRefresh(refreshInterval = 60000) {
  const [newsData, setNewsData] = React.useState<NewsItem[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchFinancialNews();
        setNewsData(data);
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

  return { newsData, loading, error };
}
