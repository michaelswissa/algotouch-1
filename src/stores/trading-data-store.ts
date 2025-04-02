
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
  clearAllData: () => void; // Added to clear all data for testing
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
        const entryDate = new Date(entryDateString);
        
        if (isNaN(entryDate.getTime())) {
          console.error('Invalid date:', entryDateString);
          return;
        }
        
        // Get the day of the month - ALWAYS use this consistent format
        const day = entryDate.getDate();
        const dayKey = `${day}-current`;
        
        if (!tradesByDay[dayKey]) {
          tradesByDay[dayKey] = [];
        }
        
        tradesByDay[dayKey].push({...trade});
      } catch (error) {
        console.error('Error processing trade for calendar:', error, trade);
      }
    });
    
    console.log('Updated tradesByDay:', Object.keys(tradesByDay).length, 'days with trades');
    console.log('All day keys:', Object.keys(tradesByDay).join(', '));
    
    // Log some sample data to debug
    if (Object.keys(tradesByDay).length > 0) {
      const sampleKey = Object.keys(tradesByDay)[0];
      console.log(`Sample data for ${sampleKey}:`, 
        `${tradesByDay[sampleKey].length} trades`);
    }
    
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
        const entryDate = new Date(entryDateString);
        
        if (isNaN(entryDate.getTime())) {
          console.error('Invalid date:', entryDateString);
          return;
        }
        
        // Get the day of the month - ALWAYS use this consistent format
        const day = entryDate.getDate();
        const dayKey = `${day}-current`;
        
        if (!tradesByDay[dayKey]) {
          tradesByDay[dayKey] = [];
        }
        
        tradesByDay[dayKey].push({...trade});
      } catch (error) {
        console.error('Error processing trade for calendar:', error, trade);
      }
    });
    
    console.log('Updated tradesByDay:', Object.keys(tradesByDay).length, 'days with trades');
    console.log('All day keys:', Object.keys(tradesByDay).join(', '));
    
    // Log some sample data to debug
    if (Object.keys(tradesByDay).length > 0) {
      const sampleKey = Object.keys(tradesByDay)[0];
      console.log(`Sample data for ${sampleKey}:`, 
        `${tradesByDay[sampleKey].length} trades`);
    }
    
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
