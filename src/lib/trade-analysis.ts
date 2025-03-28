
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
  tradeFrequency?: { date: string; count: number }[];
  cumulativePnL?: { date: string; pnl: number }[];
}

export async function parseCSVFile(file: File): Promise<TradeRecord[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      transformHeader: (header) => {
        // Hebrew to English header mapping if needed
        const headerMap: Record<string, string> = {
          'מספר חשבון': 'AccountNumber',
          'חוזה': 'Contract',
          'שם סיגנל': 'Signal Name',
          'כיוון': 'Side',
          'תאריך כניסה': 'Entry DateTime',
          'תאריך יציאה': 'Exit DateTime',
          'מחיר כניסה': 'EntryPrice',
          'מחיר יציאה': 'ExitPrice',
          'רווח/הפסד': 'ProfitLoss',
          'נטו': 'Net',
          'הון': 'Equity'
        };
        return headerMap[header] || header;
      },
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
      profitableShortTrades: 0,
      tradeFrequency: [],
      cumulativePnL: []
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
  
  // Trade frequency by date
  const tradeFrequency: { date: string; count: number }[] = [];
  const tradeDates = trades.map(trade => new Date(trade['Entry DateTime']).toLocaleDateString('he-IL'));
  const uniqueDates = [...new Set(tradeDates)];
  
  uniqueDates.forEach(date => {
    const count = tradeDates.filter(d => d === date).length;
    tradeFrequency.push({ date, count });
  });
  
  // Calculate cumulative P&L
  const sortedTrades = [...trades].sort((a, b) => 
    new Date(a['Entry DateTime']).getTime() - new Date(b['Entry DateTime']).getTime()
  );
  
  let runningPnL = 0;
  const cumulativePnL = sortedTrades.map(trade => {
    runningPnL += trade.ProfitLoss;
    return {
      date: new Date(trade['Entry DateTime']).toLocaleDateString('he-IL'),
      pnl: runningPnL
    };
  });
  
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
    profitableShortTrades,
    tradeFrequency,
    cumulativePnL
  };
}
