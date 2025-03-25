
import React from 'react';
import Layout from '@/components/Layout';
import TradeFilters from '@/components/TradeFilters';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import TradeList from '@/components/TradeList';
import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TradesPage = () => {
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">עסקאות</h1>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter size={14} />
            <span>סינון</span>
          </Button>
        </div>
        
        <TradeFilters />
        
        <PerformanceMetrics />
        
        <TradeList />
      </div>
    </Layout>
  );
};

export default TradesPage;
