
import { useState, useEffect, useCallback } from 'react';

// Define the structure of stock data
interface StockData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

// Simple error-resistant mock data for when API calls fail
const getMockStockData = (): StockData[] => {
  return [
    { symbol: 'ת״א 35', price: '1,998.29', change: '+8.24', changePercent: '+0.41%', isPositive: true },
    { symbol: 'ת״א 125', price: '2,110.19', change: '+10.05', changePercent: '+0.48%', isPositive: true },
    { symbol: 'ת״א בנקים', price: '2,747.81', change: '+13.67', changePercent: '+0.50%', isPositive: true },
    { symbol: 'NASDAQ', price: '16,742.39', change: '-55.21', changePercent: '-0.33%', isPositive: false },
    { symbol: 'S&P 500', price: '5,231.21', change: '-2.4', changePercent: '-0.05%', isPositive: false },
    { symbol: 'דולר/שקל', price: '3.712', change: '-0.003', changePercent: '-0.08%', isPositive: false }
  ];
};

// Hook for getting stock data with built-in refresh and error handling
export const useStockDataWithRefresh = (refreshInterval = 60000) => {
  const [stockData, setStockData] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const fetchStockData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Use mock data for reliability until API integration is stable
      const data = getMockStockData();
      
      setStockData(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError('שגיאה בטעינת נתוני המניות');
      
      // Fallback to mock data on error
      setStockData(getMockStockData());
    } finally {
      setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    // Initial fetch
    fetchStockData();
    
    // Set up refresh interval
    const intervalId = setInterval(fetchStockData, refreshInterval);
    
    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [fetchStockData, refreshInterval]);
  
  return { stockData, loading, error, lastUpdated, refresh: fetchStockData };
};

// Export the mock data for direct use
export const getStaticStockData = getMockStockData;
