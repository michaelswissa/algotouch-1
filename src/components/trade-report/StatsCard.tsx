import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from 'lucide-react';
import { TradeStats } from '@/lib/trade-analysis';
interface StatsCardProps {
  stats: TradeStats | null;
}
const StatsCard: React.FC<StatsCardProps> = ({
  stats
}) => {
  return <Card className="hover-glow mx-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart className="h-5 w-5 text-primary" />
          <span>סטטיסטיקת הדוח</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between">
            <span className="text-gray-600">סך עסקאות:</span>
            <span className="font-medium">{stats?.totalTrades || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">רווח/הפסד:</span>
            <span className={`font-medium ${stats?.profitLoss && stats.profitLoss >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
              {stats?.profitLoss ? stats.profitLoss >= 0 ? `$${stats.profitLoss.toFixed(2)}` : `-$${Math.abs(stats.profitLoss).toFixed(2)}` : '$0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">נטו:</span>
            <span className={`font-medium ${stats?.netProfit && stats.netProfit >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
              {stats?.netProfit ? stats.netProfit >= 0 ? `$${stats.netProfit.toFixed(2)}` : `-$${Math.abs(stats.netProfit).toFixed(2)}` : '$0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">אחוז ניצחון:</span>
            <span className="font-medium">{stats?.winRate ? `${stats.winRate.toFixed(2)}%` : '0%'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">אחוז הפסד:</span>
            <span className="font-medium">{stats?.lossRate ? `${stats.lossRate.toFixed(2)}%` : '0%'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">יחס סיכוי/סיכון:</span>
            <span className="font-medium">{stats?.riskRewardRatio || '0:0'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">העסקה הכי רווחית:</span>
            <span className="font-medium text-tradervue-green">
              {stats?.bestTrade ? `$${stats.bestTrade.toFixed(2)}` : '$0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">העסקה הכי מפסידה:</span>
            <span className="font-medium text-tradervue-red">
              {stats?.worstTrade ? `-$${Math.abs(stats.worstTrade).toFixed(2)}` : '$0.00'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">עסקאות לונג:</span>
            <span className="font-medium">{stats?.longTrades || 0}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">עסקאות שורט:</span>
            <span className="font-medium">{stats?.shortTrades || 0}</span>
          </div>
        </div>
      </CardContent>
    </Card>;
};
export default StatsCard;