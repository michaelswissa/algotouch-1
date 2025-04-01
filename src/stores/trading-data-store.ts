
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
}

export const useTradingDataStore = create<TradingDataState>((set, get) => ({
  globalTrades: [],
  setGlobalTrades: (trades) => {
    console.log("Setting global trades:", trades.length);
    set({ 
      globalTrades: trades,
      lastUpdateTimestamp: Date.now()
    });
    
    // Immediately update the tradesByDay format after setting trades
    get().updateTradesByDay();
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
        
        // Get the day of the month
        const day = entryDate.getDate();
        // Use consistent format for keys
        const dayKey = `${day}-current`;
        
        if (!tradesByDay[dayKey]) {
          tradesByDay[dayKey] = [];
        }
        
        tradesByDay[dayKey].push(trade);
      } catch (error) {
        console.error('Error processing trade for calendar:', error, trade);
      }
    });
    
    console.log('Updated tradesByDay:', Object.keys(tradesByDay).length, 'days with trades');
    set({ 
      tradesByDay,
      lastUpdateTimestamp: Date.now()
    });
  },
  
  lastUpdateTimestamp: 0
}));
