
import { TradeRecord } from "@/lib/trade-analysis";
import React from 'react';

// Chart colors
export const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
export const PIE_COLORS = {
  Long: '#3b82f6',
  Short: '#ef4444',
  WinLong: '#10b981',
  WinShort: '#10b981',
  LossLong: '#f87171',
  LossShort: '#f87171',
};

// Enhanced tooltip styles
export const tooltipStyle = {
  backgroundColor: 'rgba(255, 255, 255, 0.95)',
  border: '1px solid #ccc',
  padding: '10px',
  borderRadius: '5px',
  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.15)',
  fontSize: '14px',
  fontWeight: 500,
};

// Custom tooltip formatter for better readability
export const customTooltipFormatter = (value: number, name: string) => {
  return [`${value.toFixed(2)}`, name];
};

// Prepare contract performance data
export const prepareContractData = (trades: TradeRecord[]) => {
  const contractPerformance = trades.reduce((acc: Record<string, number>, trade) => {
    if (!acc[trade.Contract]) {
      acc[trade.Contract] = 0;
    }
    acc[trade.Contract] += trade.ProfitLoss;
    return acc;
  }, {});
  
  return Object.entries(contractPerformance).map(([contract, pnl]) => ({
    contract,
    pnl
  }));
};

// Custom pie chart label renderer with better visibility
export const renderCustomizedPieLabel = ({ 
  cx, 
  cy, 
  midAngle, 
  innerRadius, 
  outerRadius, 
  percent, 
  index, 
  name, 
  value 
}: {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
  index: number;
  name: string;
  value: number;
}) => {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
  return (
    <text 
      x={x} 
      y={y} 
      fill="#333333" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      fontSize="14"
      fontWeight="500"
      className="dark:fill-white"
    >
      {`${name}: ${(percent * 100).toFixed(0)}%`}
    </text>
  );
};
