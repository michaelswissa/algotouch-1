
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

// Helper function to fetch ticker details
async function fetchTickerDetails(symbols: string[]): Promise<PolygonTickerResponse[]> {
  const symbolsParam = symbols.join(',');
  const url = `https://api.polygon.io/v3/reference/tickers?ticker=${symbolsParam}&active=true&apiKey=${POLYGON_API_KEY}`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Polygon API error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.results || [];
  } catch (error) {
    console.error('Error fetching ticker details:', error);
    return [];
  }
}

// Helper function to fetch stock prices
async function fetchStockPrices(symbols: string[]): Promise<Record<string, any>> {
  const results: Record<string, any> = {};
  
  // Fetch each symbol's price data
  for (const symbol of symbols) {
    try {
      const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${POLYGON_API_KEY}`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.error(`Error fetching price for ${symbol}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        results[symbol] = data.results[0];
      }
    } catch (error) {
      console.error(`Error processing ${symbol}:`, error);
    }
  }
  
  return results;
}

// Main handler for the edge function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Define the stock symbols we want to track
    const stockSymbols = ["SPY", "QQQ", "DIA", "TA35.TA", "BTCUSD", "GC=F"];
    
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
      
      // Fallback if we don't have data (should rarely happen)
      return {
        symbol: displayName,
        price: "0.00",
        change: "0.00",
        changePercent: "0.00%",
        isPositive: false
      };
    });
    
    return new Response(JSON.stringify(stockData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
