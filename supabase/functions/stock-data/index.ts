
// Follow Deno's HTTP server implementation
import { corsHeaders } from '../_shared/cors.ts';

// Define the stock data interface
interface StockData {
  symbol: string;
  price: string;
  change: string;
  changePercent: string;
  isPositive: boolean;
}

// Helper function to add structured logging
function logInfo(message: string, data?: any) {
  console.log(`INFO: ${message}`, data ? JSON.stringify(data) : '');
}

function logError(message: string, error?: any) {
  console.error(`ERROR: ${message}`, error ? JSON.stringify(error) : '');
}

// Main handler for the edge function
Deno.serve(async (req) => {
  const requestStartTime = Date.now();
  logInfo('Stock data function invoked', { 
    method: req.method,
    url: req.url
  });
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    logInfo('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Define the stock symbols we want to track with Yahoo Finance compatible symbols
    const stockSymbols = [
      { id: "^GSPC", displayName: "S&P 500" },
      { id: "^IXIC", displayName: "Nasdaq" },
      { id: "^DJI", displayName: "Dow Jones" },
      { id: "TA35.TA", displayName: "Tel Aviv 35" },
      { id: "BTC-USD", displayName: "Bitcoin" },
      { id: "GC=F", displayName: "Gold" }
    ];
    
    logInfo(`Starting to fetch data for ${stockSymbols.length} symbols`);
    
    // Create an array to hold all fetch requests
    const fetchPromises = stockSymbols.map(async (stock) => {
      try {
        // Yahoo Finance API endpoint for getting quotes
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${stock.id}?interval=1d&range=1d`;
        logInfo(`Fetching data for symbol: ${stock.id}`);
        
        const response = await fetch(url, {
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          logError(`Error fetching data for ${stock.id}: ${response.status}`, errorText);
          return null;
        }
        
        const data = await response.json();
        
        // Process the data from Yahoo Finance
        if (data.chart && data.chart.result && data.chart.result.length > 0) {
          const result = data.chart.result[0];
          const quote = result.indicators.quote[0];
          const meta = result.meta;
          
          // Get the most recent values
          const lastIndex = result.timestamp.length - 1;
          const currentPrice = meta.regularMarketPrice || (quote.close && quote.close[lastIndex]) || 0;
          const previousClose = meta.chartPreviousClose || (result.meta.previousClose) || 0;
          
          // Calculate change and percent change
          const change = (currentPrice - previousClose).toFixed(2);
          const changePercent = ((currentPrice - previousClose) / previousClose * 100).toFixed(2);
          
          logInfo(`Successfully fetched data for ${stock.id}`);
          
          return {
            symbol: stock.displayName,
            price: currentPrice.toFixed(2),
            change: change,
            changePercent: `${changePercent}%`,
            isPositive: currentPrice >= previousClose
          };
        } else {
          logError(`No data available for ${stock.id}`, data);
          return null;
        }
      } catch (error) {
        logError(`Error processing ${stock.id}`, error);
        return null;
      }
    });
    
    // Wait for all fetch requests to complete
    const results = await Promise.all(fetchPromises);
    
    // Filter out null results and prepare final data
    const stockData: StockData[] = results
      .filter(result => result !== null)
      .map(result => result as StockData);
    
    // If we have missing data, use fallback for those symbols
    if (stockData.length < stockSymbols.length) {
      logInfo(`Some symbols are missing data, using fallbacks for ${stockSymbols.length - stockData.length} symbols`);
      
      // Get the symbols we already have data for
      const existingSymbols = stockData.map(item => item.symbol);
      
      // Add fallback data for missing symbols
      stockSymbols.forEach(symbol => {
        if (!existingSymbols.includes(symbol.displayName)) {
          stockData.push({
            symbol: symbol.displayName,
            price: "0.00",
            change: "0.00",
            changePercent: "0.00%",
            isPositive: false
          });
        }
      });
    }
    
    const requestDuration = Date.now() - requestStartTime;
    logInfo(`Request completed successfully in ${requestDuration}ms`, { 
      symbolsCount: stockSymbols.length,
      dataReturned: stockData.length 
    });
    
    return new Response(JSON.stringify(stockData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    logError('Error processing request', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
