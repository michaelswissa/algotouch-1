
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
    get().updateTradesByDay();
  },
  
  tradesByDay: {},
  updateTradesByDay: () => {
    const trades = get().globalTrades;
    const tradesByDay: Record<string, TradeRecord[]> = {};
    
    trades.forEach(trade => {
      // Format date to get day number
      const entryDate = new Date(trade['Entry DateTime']);
      const day = entryDate.getDate();
      const dayKey = `${day}-current`;
      
      if (!tradesByDay[dayKey]) {
        tradesByDay[dayKey] = [];
      }
      
      tradesByDay[dayKey].push(trade);
    });
    
    set({ tradesByDay });
  }
}));
