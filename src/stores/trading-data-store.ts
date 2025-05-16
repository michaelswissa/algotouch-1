
import { create } from 'zustand';
import { TradeRecord } from '@/lib/trade-analysis';

interface TradingDataState {
  globalTrades: TradeRecord[];
  setGlobalTrades: (trades: TradeRecord[]) => void;
  
  // Formatted for calendar usage
  tradesByDay: Record<string, TradeRecord[]>;
  updateTradesByDay: () => void;
  
  // For debugging
  lastUpdateTimestamp: number;
  clearAllData: () => void;
}

export const useTradingDataStore = create<TradingDataState>((set, get) => ({
  globalTrades: [],
  setGlobalTrades: (trades) => {
    console.log("Setting global trades:", trades.length);
    
    // Process trades by day when setting global trades
    const tradesByDay: Record<string, TradeRecord[]> = {};
    
    trades.forEach(trade => {
      try {
        // Format date to get day number
        const entryDateString = trade['Entry DateTime'];
        if (!entryDateString) {
          console.error('Missing entry date for trade:', trade);
          return;
        }
        
        const entryDate = new Date(entryDateString);
        
        if (isNaN(entryDate.getTime())) {
          console.error('Invalid date:', entryDateString);
          return;
        }
        
        // NEW FORMAT: Use day-month-year as the key
        const day = entryDate.getDate();
        const month = entryDate.getMonth(); // 0-11
        const year = entryDate.getFullYear();
        const dayKey = `${day}-${month}-${year}`;
        
        if (!tradesByDay[dayKey]) {
          tradesByDay[dayKey] = [];
        }
        
        tradesByDay[dayKey].push({...trade});
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error processing trade for calendar:', error.message, trade);
        } else {
          console.error('Unknown error processing trade for calendar:', String(error), trade);
        }
      }
    });
    
    console.log('Updated tradesByDay:', Object.keys(tradesByDay).length, 'days with trades');
    console.log('Sample keys:', Object.keys(tradesByDay).slice(0, 5));
    
    // Update state with all data in one operation to prevent infinite updates
    set({ 
      globalTrades: trades,
      tradesByDay,
      lastUpdateTimestamp: Date.now()
    });
  },
  
  tradesByDay: {},
  updateTradesByDay: () => {
    const trades = get().globalTrades;
    console.log("Updating tradesByDay with", trades.length, "trades");
    
    const tradesByDay: Record<string, TradeRecord[]> = {};
    
    trades.forEach(trade => {
      try {
        // Format date to get day number
        const entryDateString = trade['Entry DateTime'];
        if (!entryDateString) {
          console.error('Missing entry date for trade:', trade);
          return;
        }
        
        const entryDate = new Date(entryDateString);
        
        if (isNaN(entryDate.getTime())) {
          console.error('Invalid date:', entryDateString);
          return;
        }
        
        // NEW FORMAT: Use day-month-year as the key
        const day = entryDate.getDate();
        const month = entryDate.getMonth(); // 0-11
        const year = entryDate.getFullYear();
        const dayKey = `${day}-${month}-${year}`;
        
        if (!tradesByDay[dayKey]) {
          tradesByDay[dayKey] = [];
        }
        
        tradesByDay[dayKey].push({...trade});
      } catch (error) {
        if (error instanceof Error) {
          console.error('Error processing trade for calendar:', error.message, trade);
        } else {
          console.error('Unknown error processing trade for calendar:', String(error), trade);
        }
      }
    });
    
    console.log('Updated tradesByDay:', Object.keys(tradesByDay).length, 'days with trades');
    console.log('Sample keys:', Object.keys(tradesByDay).slice(0, 5));
    
    set({ 
      tradesByDay,
      lastUpdateTimestamp: Date.now()
    });
  },
  
  lastUpdateTimestamp: 0,
  
  clearAllData: () => {
    console.log("Clearing all trading data");
    set({
      globalTrades: [],
      tradesByDay: {},
      lastUpdateTimestamp: Date.now()
    });
  }
}));
