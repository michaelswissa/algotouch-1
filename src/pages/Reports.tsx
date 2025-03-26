
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import TradeFilters from '@/components/TradeFilters';
import ReportTabs from '@/components/ReportTabs';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import { ChevronLeft, ChevronRight, Calendar, LineChart, TrendingUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentMonth, setCurrentMonth] = useState('ינואר');
  const [currentYear, setCurrentYear] = useState(2024);

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <LineChart size={24} />
            </span>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">דוחות</span>
          </h1>
        </div>
        
        <div className="mb-6 glass-card-2025 p-4 rounded-xl">
          <TradeFilters />
        </div>
        
        <div className="mb-6">
          <ReportTabs activeTab={activeTab} onTabChange={setActiveTab} />
        </div>
        
        <div className="mb-8 glass-card-2025 p-4 rounded-xl">
          <PerformanceMetrics />
        </div>
        
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-primary/70" />
            <h2 className="text-xl font-semibold">{currentMonth}, {currentYear}</h2>
          </div>
          <div className="flex items-center gap-2 bg-white/50 dark:bg-white/5 rounded-lg border border-white/20 p-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-muted-foreground">
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium px-2">היום</span>
            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-white/10 text-muted-foreground">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-10">
          {['08', '09', '10', '11', '12', '13', '14'].map((day, i) => (
            <Card key={day} className="p-4 border-white/20 dark:border-white/5 bg-white/60 dark:bg-white/5 backdrop-blur-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{day}</span>
                  <span className="text-xs text-muted-foreground">
                    {i === 0 ? 'שני' : i === 1 ? 'שלישי' : i === 2 ? 'רביעי' : i === 3 ? 'חמישי' : i === 4 ? 'שישי' : i === 5 ? 'שבת' : 'ראשון'}
                  </span>
                </div>
                {i === 0 || i === 2 || i === 4 ? (
                  <div className="h-4 w-4 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-tradervue-green"></div>
                  </div>
                ) : i === 1 || i === 3 ? (
                  <div className="h-4 w-4 rounded-full bg-white/80 dark:bg-white/10 flex items-center justify-center">
                    <div className="h-2 w-2 rounded-full bg-tradervue-red"></div>
                  </div>
                ) : null}
              </div>
              
              <div className="text-center">
                {i === 0 || i === 2 || i === 4 ? (
                  <p className="font-bold text-tradervue-green flex items-center justify-center gap-1">
                    <ArrowUpRight size={15} />
                    ₪1.5k
                  </p>
                ) : i === 1 || i === 3 ? (
                  <p className="font-bold text-tradervue-red flex items-center justify-center gap-1">
                    <ArrowDownRight size={15} />
                    ₪1.5k
                  </p>
                ) : (
                  <p className="font-bold text-muted-foreground">₪0</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  {i === 0 || i === 1 || i === 2 || i === 3 || i === 4 ? '15 עסקאות' : '0 עסקאות'}
                </p>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium flex items-center gap-2">
              <TrendingUp size={18} className="text-primary/70" />
              העסקאות המשותפות האחרונות שלך
            </h3>
            <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/5">
              הצג הכל
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4 border-white/20 dark:border-white/5 bg-white/60 dark:bg-white/5 backdrop-blur-sm hover:shadow-md transition-all duration-300 hover:translate-y-[-2px]">
                <div className="mb-2 text-sm text-muted-foreground">6 במאי, 2021 09:30</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">ETSY</span>
                  <div className="h-6 w-24">
                    <svg viewBox="0 0 100 25" className="w-full h-full">
                      <path
                        d={i % 2 === 0 
                          ? "M0,20 C5,18 10,15 20,10 C30,5 40,15 50,12 C60,9 70,5 80,8 C90,11 95,5 100,0" 
                          : "M0,5 C5,8 10,15 20,18 C30,20 40,15 50,18 C60,20 70,18 80,15 C90,12 95,15 100,20"}
                        fill="none"
                        stroke={i % 2 === 0 ? "#0299FF" : "#ef4444"}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className={`text-sm font-medium ${i % 2 === 0 ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
                    {i % 2 === 0 ? '+$120.50 (1.2%)' : '-$85.75 (0.8%)'}
                  </span>
                  <span className="text-xs text-muted-foreground">120 מניות</span>
                </div>
              </Card>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 rounded-xl bg-white/60 dark:bg-white/5 border border-white/20 dark:border-white/5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">עסקאות פתוחות</h3>
            <span className="text-sm text-muted-foreground bg-white/50 dark:bg-white/10 px-2 py-0.5 rounded-full">30 ימים</span>
          </div>
          <span className="text-sm font-medium bg-primary/10 text-primary px-3 py-1 rounded-full">1</span>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
