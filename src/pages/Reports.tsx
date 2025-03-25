
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import TradeFilters from '@/components/TradeFilters';
import ReportTabs from '@/components/ReportTabs';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentMonth, setCurrentMonth] = useState('ינואר');
  const [currentYear, setCurrentYear] = useState(2024);

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">דוחות</h1>
        
        <TradeFilters />
        
        <ReportTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <PerformanceMetrics />
        
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">{currentMonth}, {currentYear}</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium">היום</span>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-2 mb-8">
          {['08', '09', '10', '11', '12', '13', '14'].map((day, i) => (
            <div key={day} className="tradervue-card p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1">
                  <span className="font-medium">{day}</span>
                  <span className="text-xs text-gray-500">
                    {i === 0 ? 'שני' : i === 1 ? 'שלישי' : i === 2 ? 'רביעי' : i === 3 ? 'חמישי' : i === 4 ? 'שישי' : i === 5 ? 'שבת' : 'ראשון'}
                  </span>
                </div>
                {i === 0 || i === 2 || i === 4 ? (
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none">
                    <path d="M2 10h16M10 2v16" stroke="#d1d5db" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                ) : null}
              </div>
              
              <div className="text-center">
                <p className={`font-bold ${i === 0 || i === 2 || i === 4 ? 'text-tradervue-green' : i === 1 || i === 3 ? 'text-tradervue-red' : 'text-gray-400'}`}>
                  {i === 0 || i === 2 || i === 4 ? '+₪1.5k' : i === 1 || i === 3 ? '-₪1.5k' : '₪0'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {i === 0 || i === 1 || i === 2 || i === 3 || i === 4 ? '15 עסקאות' : '0 עסקאות'}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mb-8">
          <h3 className="text-lg font-medium mb-4">העסקאות המשותפות האחרונות שלך</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="tradervue-card p-4">
                <div className="mb-2 text-sm text-gray-500">6 במאי, 2021 09:30</div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">ETSY</span>
                  <div className="h-6 w-24">
                    <svg viewBox="0 0 100 25" className="w-full h-full">
                      <path
                        d={i % 2 === 0 
                          ? "M0,20 C5,18 10,15 20,10 C30,5 40,15 50,12 C60,9 70,5 80,8 C90,11 95,5 100,0" 
                          : "M0,5 C5,8 10,15 20,18 C30,20 40,15 50,18 C60,20 70,18 80,15 C90,12 95,15 100,20"}
                        fill="none"
                        stroke={i % 2 === 0 ? "#22c55e" : "#ef4444"}
                        strokeWidth="2"
                      />
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">עסקאות פתוחות</h3>
            <span className="text-sm text-gray-500">30 ימים</span>
          </div>
          <span className="text-sm font-medium">1</span>
        </div>
      </div>
    </Layout>
  );
};

export default ReportsPage;
