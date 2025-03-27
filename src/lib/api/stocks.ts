
import React from 'react';

type StockData = {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
};

// Function to fetch stock data from a public API
export async function fetchStockIndices(): Promise<StockData[]> {
  try {
    // Using Finnhub API - normally would require API key, but 
    // we'll simulate the response for this demo
    const stockSymbols = ["SPY", "QQQ", "DIA", "TA35.TA", "BTC-USD", "GC=F"];
    
    // For education/demo purposes we'll simulate real data
    // In production, this would be replaced with actual API call
    const simulatedData: StockData[] = [
      { 
        symbol: "S&P 500", 
        price: (5246.67 + (Math.random() * 10 - 5)).toFixed(2),
        changePercent: (Math.random() * 2 - 0.5).toFixed(2) + "%",
        change: "",
        isPositive: Math.random() > 0.4
      },
      { 
        symbol: "Nasdaq", 
        price: (16742.39 + (Math.random() * 15 - 7)).toFixed(2),
        changePercent: (Math.random() * 2 - 0.4).toFixed(2) + "%",
        change: "",
        isPositive: Math.random() > 0.4
      },
      { 
        symbol: "Dow Jones", 
        price: (38836.50 + (Math.random() * 12 - 6)).toFixed(2),
        changePercent: (Math.random() * 2 - 0.6).toFixed(2) + "%",
        change: "",
        isPositive: Math.random() > 0.4
      },
      { 
        symbol: "Tel Aviv 35", 
        price: (1995.38 + (Math.random() * 8 - 4)).toFixed(2),
        changePercent: (Math.random() * 3 - 0.8).toFixed(2) + "%",
        change: "",
        isPositive: Math.random() > 0.3
      },
      { 
        symbol: "Bitcoin", 
        price: (70412.08 + (Math.random() * 500 - 250)).toFixed(2),
        changePercent: (Math.random() * 4 - 1).toFixed(2) + "%",
        change: "",
        isPositive: Math.random() > 0.4
      },
      { 
        symbol: "Gold", 
        price: (2325.76 + (Math.random() * 6 - 3)).toFixed(2),
        changePercent: (Math.random() * 1.2 - 0.3).toFixed(2) + "%",
        change: "",
        isPositive: Math.random() > 0.3
      }
    ];

    // Calculate the change value based on percentage
    return simulatedData.map(stock => {
      const priceValue = parseFloat(stock.price);
      const percentValue = parseFloat(stock.changePercent);
      const change = ((priceValue * percentValue) / 100).toFixed(2);
      return {
        ...stock,
        change
      };
    });
  } catch (error) {
    console.error('Error fetching stock data:', error);
    return [];
  }
}

// Function to refresh stock data periodically
export function useStockDataWithRefresh(refreshInterval = 15000) {
  const [stockData, setStockData] = React.useState<StockData[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await fetchStockIndices();
        setStockData(data);
        setError(null);
      } catch (err) {
        setError('Failed to fetch stock data');
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

  return { stockData, loading, error };
}
