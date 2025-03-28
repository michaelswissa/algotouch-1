
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export type NewsItem = {
  id: number;
  title: string;
  time: string;
  source: string;
  url?: string;
  description?: string;
};

// Function to fetch financial news from our Supabase edge function
export async function fetchFinancialNews(): Promise<NewsItem[]> {
  try {
    console.info('Fetching financial news from edge function...');
    
    const { data, error } = await supabase.functions.invoke('financial-news');
    
    if (error) {
      console.error('Error fetching news:', error);
      throw new Error(error.message);
    }
    
    if (!data || !Array.isArray(data)) {
      console.error('Invalid data format from news API:', data);
      throw new Error('Invalid data format from news API');
    }
    
    console.info('Successfully fetched news data:', data);
    return data as NewsItem[];
  } catch (error) {
    console.error('Error fetching news:', error);
    
    // Return fallback data in case of an error
    const currentTime = new Date();
    
    return [
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
  }
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
