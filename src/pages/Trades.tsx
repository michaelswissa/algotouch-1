
import React from 'react';
import Layout from '@/components/Layout';
import TradeFilters from '@/components/TradeFilters';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import TradeList from '@/components/TradeList';
import { Filter, LineChart, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const TradesPage = () => {
  const navigate = useNavigate();

  const handleNewTrade = () => {
    navigate('/new-trade');
  };

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <LineChart size={28} className="text-primary" />
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">עסקאות</span>
          </h1>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" className="gap-2 hover:border-primary transition-all duration-300">
              <Filter size={14} />
              <span>סינון</span>
            </Button>
            <Button 
              onClick={handleNewTrade}
              size="sm" 
              className="gap-2 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
            >
              <Plus size={14} />
              <span>עסקה חדשה</span>
            </Button>
          </div>
        </div>
        
        <div className="mb-8 animate-fade-in">
          <TradeFilters />
        </div>
        
        <div className="mb-8 animate-fade-in" style={{ animationDelay: "0.1s" }}>
          <PerformanceMetrics />
        </div>
        
        <div className="animate-fade-in" style={{ animationDelay: "0.2s" }}>
          <TradeList />
        </div>
      </div>
    </Layout>
  );
};

export default TradesPage;
