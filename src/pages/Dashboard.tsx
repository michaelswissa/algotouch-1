
import React, { useCallback } from 'react';
import Layout from '@/components/Layout';
import Courses from '@/components/Courses';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownRight, TrendingUp, RefreshCw, Clock, BookOpen, Newspaper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { format } from 'date-fns';
import BlogSection from '@/components/BlogSection';
import { useStockData } from '@/contexts/stock/StockDataContext';
import ErrorBoundary from '@/components/ErrorBoundary';

// Extracted StockIndicesSection for better component organization
const StockIndicesSection = () => {
  const { stockData, loading, error, lastUpdated } = useStockData();
  
  // Format last updated time
  const formattedStocksLastUpdated = lastUpdated 
    ? format(lastUpdated, 'HH:mm:ss')
    : 'לא ידוע';
    
  // Loading state
  if (loading && stockData.length === 0) {
    return <StockIndicesLoadingState />;
  }

  // Error state
  if (error) {
    return (
      <Card className="p-4 border-red-300 bg-red-50 dark:bg-red-900/10">
        <p className="text-red-600 dark:text-red-400">שגיאה בטעינת נתוני המדדים. נסה לרענן את הדף.</p>
      </Card>
    );
  }

  return (
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stockData.map((index) => (
          <StockIndexCard key={index.symbol} index={index} />
        ))}
      </div>
    </div>
  );
};

// Extracted StockIndicesLoadingState component
const StockIndicesLoadingState = () => (
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
);

// Extracted StockIndexCard component
const StockIndexCard = ({ index }: { index: any }) => (
  <Card className="hover-scale">
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
);

// Dashboard component
const Dashboard = () => {
  const { toast } = useToast();

  const handleManualRefresh = useCallback(() => {
    window.location.reload();
    toast({
      title: "מרענן נתונים",
      description: "הנתונים מתעדכנים...",
      duration: 2000,
    });
  }, [toast]);

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
        <ErrorBoundary fallback={<div>שגיאה בטעינת נתוני מדד. אנא נסה לרענן את הדף.</div>}>
          <StockIndicesSection />
        </ErrorBoundary>
        
        {/* Blog Section */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Newspaper size={18} className="text-primary" />
              <span>פוסטים אחרונים</span>
            </h2>
          </div>
          <BlogSection />
        </div>
        
        {/* Courses Section - Last */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen size={20} className="text-primary" />
            <span>קורסים דיגיטליים</span>
          </h2>
          <Courses />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
