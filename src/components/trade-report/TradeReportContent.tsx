import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradeRecord, TradeStats } from '@/lib/trade-analysis';
import TradeDataTable from '@/components/TradeDataTable';
import TradeCharts from '@/components/TradeCharts';
interface TradeReportContentProps {
  trades: TradeRecord[];
  stats: TradeStats | null;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}
const TradeReportContent: React.FC<TradeReportContentProps> = ({
  trades,
  stats,
  activeTab,
  setActiveTab
}) => {
  if (trades.length === 0) {
    return <Card className="mx-0">
        <CardHeader>
          <CardTitle>עסקאות אחרונות</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-center">
            <div>
              <Table className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium mb-2">אין עסקאות להצגה</h3>
              <p className="text-sm text-slate-400">
                העלה קובץ CSV או הוסף עסקה ידנית כדי לראות את העסקאות שלך כאן.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>;
  }
  return <Card className="glass-card-2025">
      <CardHeader className="border-b pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Table className="h-5 w-5 text-primary" />
            <span>נתוני עסקאות</span>
          </CardTitle>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="table">טבלה</TabsTrigger>
              <TabsTrigger value="charts">גרפים</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="p-4">
          {activeTab === 'table' && <TradeDataTable trades={trades} />}
          {activeTab === 'charts' && stats && <TradeCharts trades={trades} stats={stats} />}
        </div>
      </CardContent>
    </Card>;
};
export default TradeReportContent;