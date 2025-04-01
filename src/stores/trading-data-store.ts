
import { create } from 'zustand';
import { TradeRecord } from '@/lib/trade-analysis';

interface TradingDataState {
  globalTrades: TradeRecord[];
  setGlobalTrades: (trades: TradeRecord[]) => void;
  
  // Formatted for calendar usage
  tradesByDay: Record<string, TradeRecord[]>;
  updateTradesByDay: () => void;
}

export const useTradingDataStore = create<TradingDataState>((set, get) => ({
  globalTrades: [],
  setGlobalTrades: (trades) => {
    set({ globalTrades: trades });
    // After setting global trades, update the calendar format
    setTimeout(() => get().updateTradesByDay(), 0); // Use setTimeout to ensure state is updated first
  },
  
  tradesByDay: {},
  updateTradesByDay: () => {
    const trades = get().globalTrades;
    const tradesByDay: Record<string, TradeRecord[]> = {};
    
    trades.forEach(trade => {
      try {
        // Format date to get day number
        const entryDate = new Date(trade['Entry DateTime']);
        
        if (isNaN(entryDate.getTime())) {
          console.error('Invalid date:', trade['Entry DateTime']);
          return;
        }
        
        const day = entryDate.getDate();
        const dayKey = `${day}-current`;
        
        if (!tradesByDay[dayKey]) {
          tradesByDay[dayKey] = [];
        }
        
        tradesByDay[dayKey].push(trade);
      } catch (error) {
        console.error('Error processing trade for calendar:', error, trade);
      }
    });
    
    console.log('Updated tradesByDay:', tradesByDay);
    set({ tradesByDay });
  }
}));
