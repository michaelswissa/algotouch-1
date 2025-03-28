
import React from 'react';
import Layout from '@/components/Layout';
import Courses from '@/components/Courses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Info, RefreshCw, Clock, Calendar } from 'lucide-react';
import { useStockDataWithRefresh } from '@/lib/api/stocks';
import { useNewsDataWithRefresh } from '@/lib/api/news';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import BlogSection from '@/components/BlogSection';

const Dashboard = () => {
  const { toast } = useToast();
  const { stockData, loading: stocksLoading, error: stocksError, lastUpdated: stocksLastUpdated } = useStockDataWithRefresh(30000); // Refresh every 30 seconds
  const { newsData, loading: newsLoading, error: newsError, lastUpdated: newsLastUpdated } = useNewsDataWithRefresh(60000); // Refresh every minute

  const handleManualRefresh = () => {
    window.location.reload();
    toast({
      title: "מרענן נתונים",
      description: "הנתונים מתעדכנים...",
      duration: 2000,
    });
  };

  // Format last updated time
  const formattedStocksLastUpdated = stocksLastUpdated 
    ? format(stocksLastUpdated, 'HH:mm:ss')
    : 'לא ידוע';

  const formattedNewsLastUpdated = newsLastUpdated 
    ? format(newsLastUpdated, 'HH:mm:ss')
    : 'לא ידוע';

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold mb-8 flex items-center">
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">לוח בקרה</span>
          </h1>
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-2 mb-8"
          >
            <RefreshCw size={14} className="mr-1" />
            <span>רענן נתונים</span>
          </Button>
        </div>
        
        {/* Stock Indices Section - First for greater prominence */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              <span>מדדים בזמן אמת</span>
            </h2>
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock size={14} className="mr-1" />
              <span>עודכן לאחרונה: {formattedStocksLastUpdated}</span>
            </div>
          </div>
          
          {stocksLoading && stockData.length === 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <Card key={i} className="hover-scale">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center animate-pulse">
                      <div className="w-20 h-6 bg-muted rounded"></div>
                      <div className="w-16 h-6 bg-muted rounded"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : stocksError ? (
            <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-900/10">
              <p className="text-red-600 dark:text-red-400">שגיאה בטעינת נתוני המדדים. נסה לרענן את הדף.</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stockData.map((index) => (
                <Card key={index.symbol} className="hover-scale">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-foreground">{index.symbol}</h3>
                        <p className="text-2xl font-medium mt-1">{index.price}</p>
                      </div>
                      <div className={`flex items-center text-lg ${index.isPositive ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
                        {index.isPositive ? 
                          <ArrowUpRight className="mr-1" size={20} /> : 
                          <ArrowDownRight className="mr-1" size={20} />
                        }
                        <span>{index.changePercent} ({index.change})</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        
        {/* Layout grid for news and blog */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* News Section - Left column */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Info size={18} className="text-primary" />
                <span>חדשות שוק ההון</span>
              </h2>
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar size={14} className="mr-1" />
                <span>עודכן לאחרונה: {formattedNewsLastUpdated}</span>
              </div>
            </div>
            
            {newsLoading && newsData.length === 0 ? (
              <Card className="elevated-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="p-4 animate-pulse">
                        <div className="w-3/4 h-5 bg-muted rounded mb-2"></div>
                        <div className="flex justify-between">
                          <div className="w-16 h-4 bg-muted rounded"></div>
                          <div className="w-24 h-4 bg-muted rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : newsError ? (
              <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-900/10">
                <p className="text-red-600 dark:text-red-400">שגיאה בטעינת החדשות. נסה לרענן את הדף.</p>
              </Card>
            ) : (
              <Card className="elevated-card overflow-hidden">
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {newsData.map(news => (
                      <a 
                        key={news.id} 
                        href={news.url || "#"} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block p-4 hover:bg-secondary/50 transition-all duration-200 cursor-pointer"
                      >
                        <h3 className="font-medium text-foreground">{news.title}</h3>
                        {news.description && (
                          <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{news.description}</p>
                        )}
                        <div className="flex items-center justify-between mt-2 text-sm text-muted-foreground">
                          <span>{news.source}</span>
                          <span>{news.time}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Blog Section - Right column */}
          <BlogSection />
        </div>
        
        {/* Courses Section - Last */}
        <Courses />
      </div>
    </Layout>
  );
};

export default Dashboard;
