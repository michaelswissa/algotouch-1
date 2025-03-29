
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
  '3-current': [
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Breakout",
      Side: 'Long',
      'Entry DateTime': "2023-03-03T10:45:00",
      'Exit DateTime': "2023-03-03T12:30:00",
      EntryPrice: 15710,
      ExitPrice: 15760,
      ProfitLoss: 500,
      Net: 480,
      Equity: 26200
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
  '12-current': [
    {
      AccountNumber: "12345",
      Contract: "ES",
      'Signal Name': "Support Bounce",
      Side: 'Long',
      'Entry DateTime': "2023-03-12T11:00:00",
      'Exit DateTime': "2023-03-12T13:45:00",
      EntryPrice: 4820,
      ExitPrice: 4840,
      ProfitLoss: 1000,
      Net: 970,
      Equity: 25960
    },
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Double Bottom",
      Side: 'Long',
      'Entry DateTime': "2023-03-12T14:30:00",
      'Exit DateTime': "2023-03-12T15:45:00",
      EntryPrice: 15600,
      ExitPrice: 15640,
      ProfitLoss: 400,
      Net: 385,
      Equity: 26345
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
  ],
  '19-current': [
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Trend Follow",
      Side: 'Long',
      'Entry DateTime': "2023-03-19T09:30:00",
      'Exit DateTime': "2023-03-19T12:15:00",
      EntryPrice: 15750,
      ExitPrice: 15810,
      ProfitLoss: 600,
      Net: 580,
      Equity: 27020
    }
  ],
  '20-current': [
    {
      AccountNumber: "12345",
      Contract: "ES",
      'Signal Name': "Resistance Break",
      Side: 'Short',
      'Entry DateTime': "2023-03-20T10:45:00",
      'Exit DateTime': "2023-03-20T12:30:00",
      EntryPrice: 4875,
      ExitPrice: 4840,
      ProfitLoss: -1750,
      Net: -1780,
      Equity: 25240
    }
  ],
  '29-current': [
    {
      AccountNumber: "12345",
      Contract: "NQ",
      'Signal Name': "Range Breakout",
      Side: 'Long',
      'Entry DateTime': "2023-03-29T11:15:00",
      'Exit DateTime': "2023-03-29T14:00:00",
      EntryPrice: 15800,
      ExitPrice: 15850,
      ProfitLoss: 500,
      Net: 480,
      Equity: 25720
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
