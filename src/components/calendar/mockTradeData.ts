
import { TradeRecord } from '@/lib/trade-analysis';

// Sample mock data for trades on specific days
export const mockTradeData: Record<string, TradeRecord[]> = {
  '2-current': [
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Breakout",
      Side: 'Long',
      'Entry DateTime': "2023-03-02T09:30:00",
      'Exit DateTime': "2023-03-02T11:45:00",
      EntryPrice: 15680,
      ExitPrice: 15720,
      ProfitLoss: 400,
      Net: 385,
      Equity: 25000
    },
    {
      AccountNumber: "12345",
      Contract: "ES",
      'Signal Name': "Trend Follow",
      Side: 'Long',
      'Entry DateTime': "2023-03-02T13:15:00",
      'Exit DateTime': "2023-03-02T14:30:00",
      EntryPrice: 4850,
      ExitPrice: 4865,
      ProfitLoss: 750,
      Net: 720,
      Equity: 25720
    }
  ],
  '9-current': [
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Reversal",
      Side: 'Short',
      'Entry DateTime': "2023-03-09T10:15:00",
      'Exit DateTime': "2023-03-09T11:30:00",
      EntryPrice: 15820,
      ExitPrice: 15750,
      ProfitLoss: -700,
      Net: -730,
      Equity: 24990
    }
  ],
  '17-current': [
    {
      AccountNumber: "12345",
      Contract: "ES",
      'Signal Name': "Support Bounce",
      Side: 'Long',
      'Entry DateTime': "2023-03-17T09:45:00",
      'Exit DateTime': "2023-03-17T13:20:00",
      EntryPrice: 4830,
      ExitPrice: 4860,
      ProfitLoss: 1500,
      Net: 1450,
      Equity: 26440
    }
  ]
};

// Mock data for days with trading status
export const mockDaysWithStatus: Record<number, 'positive' | 'negative' | 'neutral'> = {
  2: 'positive',
  3: 'positive',
  9: 'negative',
  11: 'negative',
  12: 'positive',
  13: 'negative',
  17: 'positive',
  19: 'positive',
  20: 'negative',
  26: 'negative',
  29: 'positive',
  30: 'positive',
  31: 'positive',
};
