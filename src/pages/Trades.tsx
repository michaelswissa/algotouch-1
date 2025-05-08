
import React from 'react';
import TradeFilters from '@/components/TradeFilters';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import TradeList from '@/components/TradeList';
import { Filter, LineChart, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';

const TradesPage = () => {
  const navigate = useNavigate();

  const handleNewTrade = () => {
    navigate('/new-trade');
  };

  return (
    <div className="tradervue-container py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
            <LineChart size={24} />
          </span>
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">עסקאות</span>
        </h1>
        
        <div className="flex gap-3 items-center">
          <div className="relative max-w-xs">
            <Input 
              placeholder="חיפוש עסקאות..." 
              className="pl-9 pr-4 py-2 h-9 rounded-lg bg-white/80 dark:bg-white/5"
            />
            <Search size={15} className="absolute left-3 top-2.5 text-muted-foreground/70" />
          </div>
          
          <Button variant="outline" size="sm" className="gap-2 border-border/50 hover:border-primary hover:bg-primary/5 transition-all duration-300">
            <Filter size={14} />
            <span>סינון</span>
          </Button>
          
          <Button 
            onClick={handleNewTrade}
            size="sm" 
            className="gap-2 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-sm"
          >
            <Plus size={14} />
            <span>עסקה חדשה</span>
          </Button>
        </div>
      </div>
      
      <div className="mb-8 animate-fade-in bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-white/30 dark:border-white/5 shadow-sm backdrop-blur-sm">
        <TradeFilters />
      </div>
      
      <div className="mb-8 animate-fade-in glass-card-2025 p-4 rounded-xl" style={{ animationDelay: "0.1s" }}>
        <PerformanceMetrics />
      </div>
      
      <div className="animate-fade-in bg-white/50 dark:bg-white/5 p-4 rounded-xl border border-white/30 dark:border-white/5 shadow-sm backdrop-blur-sm" style={{ animationDelay: "0.2s" }}>
        <TradeList />
      </div>
    </div>
  );
};

export default TradesPage;
