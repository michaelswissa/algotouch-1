
import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchStockData, StockDataItem } from '@/lib/edge-functions';

export interface StockIndex {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

export interface StockDataContextType {
  stockData: StockIndex[];
  loading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refreshData: () => Promise<void>;
}

const StockDataContext = createContext<StockDataContextType>({
  stockData: [],
  loading: false,
  error: null,
  lastUpdated: null,
  refreshData: async () => {},
});

export const StockDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [stockData, setStockData] = useState<StockIndex[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await fetchStockData();
      
      if (fetchError) {
        throw fetchError;
      }
      
      if (data && Array.isArray(data)) {
        const formattedData = data.map((item: StockDataItem) => ({
          symbol: item.symbol,
          price: item.currentPrice.toLocaleString(),
          change: item.change,
          changePercent: item.changePercent,
          isPositive: parseFloat(item.change) >= 0
        }));
        
        setStockData(formattedData);
        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error('Error fetching stock data:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch data on component mount
  useEffect(() => {
    refreshData();
    
    // Set up an interval to refresh data every 3 minutes
    const intervalId = setInterval(() => {
      refreshData();
    }, 3 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  return (
    <StockDataContext.Provider value={{ 
      stockData, 
      loading, 
      error, 
      lastUpdated,
      refreshData
    }}>
      {children}
    </StockDataContext.Provider>
  );
};

export const useStockData = () => {
  const context = useContext(StockDataContext);
  if (context === undefined) {
    throw new Error('useStockData must be used within a StockDataProvider');
  }
  return context;
};
