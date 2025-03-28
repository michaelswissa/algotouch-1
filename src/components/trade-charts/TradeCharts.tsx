
import React, { useState } from 'react';
import { TradeRecord, TradeStats } from '@/lib/trade-analysis';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EquityChart from './EquityChart';
import ProfitLossChart from './ProfitLossChart';
import CumulativePnLChart from './CumulativePnLChart';
import ContractPerformanceChart from './ContractPerformanceChart';
import { DistributionCharts } from './DistributionCharts';

interface TradeChartsProps {
  trades: TradeRecord[];
  stats: TradeStats;
}

const TradeCharts: React.FC<TradeChartsProps> = ({ trades, stats }) => {
  const [activeChart, setActiveChart] = useState('basic');
  
  if (!trades.length) return null;

  return (
    <div className="space-y-6" dir="rtl">
      <Tabs value={activeChart} onValueChange={setActiveChart}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">גרפים בסיסיים</TabsTrigger>
          <TabsTrigger value="advanced">ניתוח מתקדם</TabsTrigger>
          <TabsTrigger value="distribution">התפלגויות</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EquityChart trades={trades} />
            <ProfitLossChart trades={trades} />
          </div>
        </TabsContent>
        
        <TabsContent value="advanced" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CumulativePnLChart stats={stats} />
            <ContractPerformanceChart trades={trades} />
          </div>
        </TabsContent>
        
        <TabsContent value="distribution" className="space-y-6">
          <DistributionCharts stats={stats} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TradeCharts;
