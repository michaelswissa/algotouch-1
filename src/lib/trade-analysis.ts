
import Papa from 'papaparse';

export interface TradeRecord {
  AccountNumber: string;
  Contract: string;
  'Signal Name': string;
  Side: 'Long' | 'Short';
  'Entry DateTime': string;
  'Exit DateTime': string;
  EntryPrice: number;
  ExitPrice: number;
  ProfitLoss: number;
  Net: number;
  Equity: number;
}

export interface TradeStats {
  totalTrades: number;
  profitLoss: number;
  netProfit: number;
  winRate: number;
  lossRate: number;
  riskRewardRatio: string;
  bestTrade: number;
  worstTrade: number;
  averageTrade: number;
  longTrades: number;
  shortTrades: number;
  profitableLongTrades: number;
  profitableShortTrades: number;
}

export async function parseCSVFile(file: File): Promise<TradeRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      complete: (results) => {
        const data = results.data as TradeRecord[];
        // Filter out any empty rows
        const validData = data.filter(record => 
          record.AccountNumber && 
          record.Contract && 
          record['Entry DateTime']
        );
        resolve(validData);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

export function calculateTradeStats(trades: TradeRecord[]): TradeStats {
  if (!trades.length) {
    return {
      totalTrades: 0,
      profitLoss: 0,
      netProfit: 0,
      winRate: 0,
      lossRate: 0,
      riskRewardRatio: '0:0',
      bestTrade: 0,
      worstTrade: 0,
      averageTrade: 0,
      longTrades: 0,
      shortTrades: 0,
      profitableLongTrades: 0,
      profitableShortTrades: 0
    };
  }

  const profitLoss = trades.reduce((sum, trade) => sum + trade.ProfitLoss, 0);
  const netProfit = trades.reduce((sum, trade) => sum + trade.Net, 0);
  
  const winningTrades = trades.filter(trade => trade.ProfitLoss > 0);
  const losingTrades = trades.filter(trade => trade.ProfitLoss <= 0);
  
  const winRate = (winningTrades.length / trades.length) * 100;
  const lossRate = (losingTrades.length / trades.length) * 100;
  
  const avgWin = winningTrades.length 
    ? winningTrades.reduce((sum, trade) => sum + trade.ProfitLoss, 0) / winningTrades.length 
    : 0;
    
  const avgLoss = losingTrades.length 
    ? Math.abs(losingTrades.reduce((sum, trade) => sum + trade.ProfitLoss, 0) / losingTrades.length)
    : 0;
  
  const riskRewardRatio = avgLoss ? `${(avgWin / avgLoss).toFixed(2)}:1` : '0:0';
  
  const bestTrade = Math.max(...trades.map(trade => trade.ProfitLoss));
  const worstTrade = Math.min(...trades.map(trade => trade.ProfitLoss));
  const averageTrade = profitLoss / trades.length;
  
  const longTrades = trades.filter(trade => trade.Side === 'Long').length;
  const shortTrades = trades.filter(trade => trade.Side === 'Short').length;
  
  const profitableLongTrades = trades.filter(trade => trade.Side === 'Long' && trade.ProfitLoss > 0).length;
  const profitableShortTrades = trades.filter(trade => trade.Side === 'Short' && trade.ProfitLoss > 0).length;
  
  return {
    totalTrades: trades.length,
    profitLoss,
    netProfit,
    winRate,
    lossRate,
    riskRewardRatio,
    bestTrade,
    worstTrade,
    averageTrade,
    longTrades,
    shortTrades,
    profitableLongTrades,
    profitableShortTrades
  };
}
