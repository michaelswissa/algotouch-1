
import React from 'react';
import { TradeRecord } from '@/lib/trade-analysis';

// Function to get trade count for a specific day
export const getTradeCount = (
  day: number, 
  month: 'current' | 'prev' | 'next',
  tradesData: Record<string, TradeRecord[]>
): number => {
  if (month !== 'current') return 0;
  
  // The consistent key format: day-current
  const dayKey = `${day}-current`;
  return tradesData[dayKey]?.length || 0;
};

// Calculate daily profit/loss
export const getDailyPnL = (
  day: number, 
  month: 'current' | 'prev' | 'next',
  tradesData: Record<string, TradeRecord[]>
): number => {
  if (month !== 'current') return 0;
  
  // The consistent key format: day-current
  const dayKey = `${day}-current`;
  const trades = tradesData[dayKey] || [];
  return trades.reduce((total, trade) => total + (trade.Net || 0), 0);
};

// Get a preview of trades for tooltip
export const getTradesPreview = (
  day: number, 
  month: 'current' | 'prev' | 'next',
  tradesData: Record<string, TradeRecord[]>
): React.ReactNode => {
  if (month !== 'current') return null;
  
  // The consistent key format: day-current
  const dayKey = `${day}-current`;
  const trades = tradesData[dayKey] || [];
  
  if (trades.length === 0) return null;
  
  // Return first 3 trades for preview
  return trades.slice(0, 3).map((trade, index) => (
    <div key={index} className="text-xs border-b border-gray-200 dark:border-gray-700 py-1 last:border-0">
      <div className="flex justify-between">
        <span>{trade.Contract}</span>
        <span className={trade.Net > 0 ? "text-green-600" : "text-red-600"}>
          ${trade.Net.toFixed(2)}
        </span>
      </div>
    </div>
  ));
};
