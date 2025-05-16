
import React from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/auth';
import { useStockData } from '@/contexts/stock/StockDataContext';
import { Card } from '@/components/ui/card';
import { PageTitle } from '@/components/ui/page-title';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Spinner } from '@/components/ui/spinner';

const data = [
  { name: 'ינואר', רווח: 4000, הפסד: 2400 },
  { name: 'פברואר', רווח: 3000, הפסד: 1398 },
  { name: 'מרץ', רווח: 2000, הפסד: 9800 },
  { name: 'אפריל', רווח: 2780, הפסד: 3908 },
  { name: 'מאי', רווח: 1890, הפסד: 4800 },
  { name: 'יוני', רווח: 2390, הפסד: 3800 },
];

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { stockData, isLoading: stocksLoading } = useStockData();

  if (loading) {
    return (
      <Layout>
        <div className="flex h-full items-center justify-center">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6">
        <PageTitle>לוח בקרה</PageTitle>
        <div className="mb-6">
          <Card className="p-6">
            <h2 className="text-xl font-bold mb-2">שלום {user?.user_metadata?.first_name || 'משתמש'}</h2>
            <p className="text-muted-foreground">
              ברוך הבא למערכת AlgoTouch. כאן תוכל לעקוב אחר ביצועי המסחר שלך, לנהל את היומן המסחרי ולקבל תובנות מעמיקות.
            </p>
          </Card>
        </div>

        <Tabs defaultValue="overview" className="mb-6">
          <TabsList className="mb-4">
            <TabsTrigger value="overview">סקירה כללית</TabsTrigger>
            <TabsTrigger value="performance">ביצועים</TabsTrigger>
            <TabsTrigger value="stocks">מניות</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <Card className="p-6">
                <h3 className="font-bold mb-2">סיכום חודשי</h3>
                <div className="text-2xl font-bold text-green-500">+12%</div>
                <p className="text-sm text-muted-foreground">מגמת עליה לעומת החודש הקודם</p>
              </Card>
              
              <Card className="p-6">
                <h3 className="font-bold mb-2">עסקאות השבוע</h3>
                <div className="flex">
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-green-500">12</div>
                    <div className="text-sm text-muted-foreground">רווחיות</div>
                  </div>
                  <div className="flex-1">
                    <div className="text-2xl font-bold text-red-500">5</div>
                    <div className="text-sm text-muted-foreground">הפסדים</div>
                  </div>
                </div>
              </Card>
              
              <Card className="p-6">
                <h3 className="font-bold mb-2">יומן המסחר</h3>
                <p className="text-sm text-muted-foreground">הרשומה האחרונה נוצרה לפני 2 ימים</p>
                <button className="mt-2 text-primary">כתוב רשומה חדשה</button>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="performance">
            <Card className="p-6">
              <h3 className="font-bold mb-4">ביצועים לאורך זמן</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="רווח" fill="#22c55e" />
                    <Bar dataKey="הפסד" fill="#ef4444" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </TabsContent>
          
          <TabsContent value="stocks">
            <Card className="p-6">
              <h3 className="font-bold mb-4">מדדי מניות פופולריים</h3>
              {stocksLoading ? (
                <div className="flex justify-center p-4">
                  <Spinner />
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {stockData?.map((stock, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="font-bold">{stock.symbol || 'סמל לא ידוע'}</div>
                      <div className={`text-lg ${Number(stock.change) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {stock.price || '0'} ({stock.change || '0'}%)
                      </div>
                    </div>
                  )) || (
                    <div className="text-center p-4">אין נתוני מניות זמינים</div>
                  )}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
          <Card className="p-6">
            <h3 className="font-bold mb-4">קורסים מומלצים</h3>
            <div className="space-y-2">
              <div className="p-2 hover:bg-accent rounded cursor-pointer">
                <div className="font-medium">קורס מסחר יומי</div>
                <div className="text-sm text-muted-foreground">למד את הטכניקות המתקדמות ביותר למסחר יומי</div>
              </div>
              <div className="p-2 hover:bg-accent rounded cursor-pointer">
                <div className="font-medium">ניתוח טכני מתקדם</div>
                <div className="text-sm text-muted-foreground">הבן את הגרפים וקבל החלטות מסחר חכמות יותר</div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6">
            <h3 className="font-bold mb-4">פרסומים אחרונים</h3>
            <div className="space-y-2">
              <div className="p-2 hover:bg-accent rounded cursor-pointer">
                <div className="font-medium">כיצד להתמודד עם תנודתיות בשוק</div>
                <div className="text-sm text-muted-foreground">פורסם לפני 3 ימים</div>
              </div>
              <div className="p-2 hover:bg-accent rounded cursor-pointer">
                <div className="font-medium">5 אסטרטגיות מסחר לשוק דובי</div>
                <div className="text-sm text-muted-foreground">פורסם לפני שבוע</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
