
// Follow Deno's HTTP server implementation
import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.2';

const POLYGON_API_KEY = Deno.env.get('POLYGON_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

interface PolygonTickerResponse {
  ticker: string;
  name: string;
  market: string;
  locale: string;
  primary_exchange: string;
  type: string;
  active: boolean;
  currency_name: string;
  cik: string;
  composite_figi: string;
  share_class_figi: string;
  last_updated_utc: string;
}

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

// Helper function to fetch ticker details with retries and better error handling
async function fetchTickerDetails(symbols: string[], retries = 2): Promise<PolygonTickerResponse[]> {
  const symbolsParam = symbols.join(',');
  const url = `https://api.polygon.io/v3/reference/tickers?ticker=${symbolsParam}&active=true&apiKey=${POLYGON_API_KEY}`;
  
  try {
    logInfo(`Fetching ticker details for symbols: ${symbolsParam}`);
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (response.status === 429 && retries > 0) {
      logInfo('Rate limit hit for ticker details, retrying after delay');
      // Wait for 1 second before retrying (adjust if needed)
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchTickerDetails(symbols, retries - 1);
    }
    
    if (!response.ok) {
      const errorText = await response.text();
      logError(`Polygon API error for ticker details: ${response.status}`, errorText);
      throw new Error(`Polygon API error: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    logInfo(`Successfully fetched ticker details for ${data.results?.length || 0} symbols`);
    return data.results || [];
  } catch (error) {
    logError('Error fetching ticker details', error);
    return [];
  }
}

// Helper function to fetch stock prices with retries and better error handling
async function fetchStockPrices(symbols: string[], retries = 2): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  
  // Fetch each symbol's price data with better error handling
  for (const symbol of symbols) {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${POLYGON_API_KEY}`;
      logInfo(`Fetching price data for symbol: ${symbol}`);
      
      const response = await fetch(url, {
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.status === 429 && retries > 0) {
        logError(`Rate limit hit for ${symbol}, retrying after delay`);
        // Wait for 1 second before retrying (adjust if needed)
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryData = await fetchStockPrices([symbol], retries - 1);
        if (retryData[symbol]) {
          results[symbol] = retryData[symbol];
        }
        continue;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        logError(`Error fetching price for ${symbol}: ${response.status}`, errorText);
        continue;
      }
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        logInfo(`Successfully fetched price data for ${symbol}`);
        results[symbol] = data.results[0];
      } else {
        logError(`No price data available for ${symbol}`, data);
      }
    } catch (error) {
      logError(`Error processing ${symbol}`, error);
    }
  }
  
  return results;
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
    // Define the stock symbols we want to track
    const stockSymbols = ["SPY", "QQQ", "DIA", "TA35.TA", "BTCUSD", "GC=F"];
    logInfo(`Starting to fetch data for ${stockSymbols.length} symbols`);
    
    // Fetch both ticker details and price data
    const [tickerDetails, priceData] = await Promise.all([
      fetchTickerDetails(stockSymbols),
      fetchStockPrices(stockSymbols)
    ]);
    
    // Process the data into our desired format
    const stockData: StockData[] = stockSymbols.map(symbol => {
      let displayName = symbol;
      
      // Map specific symbols to more user-friendly names
      if (symbol === "SPY") displayName = "S&P 500";
      if (symbol === "QQQ") displayName = "Nasdaq";
      if (symbol === "DIA") displayName = "Dow Jones";
      if (symbol === "TA35.TA") displayName = "Tel Aviv 35";
      if (symbol === "BTCUSD") displayName = "Bitcoin";
      if (symbol === "GC=F") displayName = "Gold";
      
      // Get price data for this symbol
      const price = priceData[symbol];
      
      if (price) {
        const closePrice = price.c.toFixed(2);
        const previousClose = price.o;
        const change = (price.c - previousClose).toFixed(2);
        const changePercent = ((price.c - previousClose) / previousClose * 100).toFixed(2) + "%";
        const isPositive = price.c >= previousClose;
        
        return {
          symbol: displayName,
          price: closePrice,
          change,
          changePercent,
          isPositive
        };
      }
      
      logInfo(`No price data found for ${symbol}, using fallback data`);
      // Fallback if we don't have data (should rarely happen)
      return {
        symbol: displayName,
        price: "0.00",
        change: "0.00",
        changePercent: "0.00%",
        isPositive: false
      };
    });
    
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
