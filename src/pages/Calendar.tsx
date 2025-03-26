
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import MonthCalendar from '@/components/MonthCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, TrendingUp, TrendingDown, LineChart, ArrowUp, ArrowDown } from 'lucide-react';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

const Calendar = () => {
  // Current date for default month/year
  const currentDate = new Date();
  const [currentMonth] = useState(currentDate.toLocaleString('he-IL', { month: 'long' }));
  const [currentYear] = useState(currentDate.getFullYear());

  // Mock trade days data for the calendar
  const tradeDays: TradeDay[] = [
    { date: "2023-03-01", trades: 5, profit: 243.50, status: "Open" },
    { date: "2023-03-02", trades: 3, profit: -120.75, status: "Active" },
    { date: "2023-03-05", trades: 7, profit: 385.20, status: "Open" },
    { date: "2023-03-08", trades: 2, profit: -85.30, status: "Open" },
    { date: "2023-03-10", trades: 4, profit: 195.60, status: "Active" },
    { date: "2023-03-15", trades: 6, profit: 310.90, status: "Open" },
    { date: "2023-03-17", trades: 3, profit: -150.45, status: "Active" },
    { date: "2023-03-22", trades: 5, profit: 270.80, status: "Open" },
    { date: "2023-03-25", trades: 4, profit: -110.25, status: "Active" },
    { date: "2023-03-28", trades: 8, profit: 420.70, status: "Open" },
  ];

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <CalendarDays size={30} className="text-primary" />
          <span className="text-gradient-blue">לוח שנה</span>
        </h1>
        
        <div className="flex flex-col max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Column - Centered with modern styling */}
            <div className="lg:col-span-2">
              <Card className="glass-card-2025 overflow-hidden hover-glow">
                <CardHeader className="pb-2 flex flex-row items-center justify-between bg-gradient-to-r from-background to-background/50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CalendarDays size={18} className="text-primary" />
                    <span className="neon-text">לוח שנה מסחר</span>
                  </CardTitle>
                  <div className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                    {currentMonth} {currentYear}
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-center">
                    <div className="w-full max-w-md pb-2">
                      <MonthCalendar 
                        month={currentMonth} 
                        year={currentYear} 
                        status="Open" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Recent Activity with modern styling */}
            <div>
              <Card className="glass-card-2025 h-full hover-glow">
                <CardHeader className="pb-2 bg-gradient-to-r from-background to-background/50">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary" />
                    <span className="neon-text">פעילות אחרונה</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {tradeDays.slice(0, 5).map((day, index) => (
                      <div key={index} className="flex items-center justify-between py-3 px-4 border-b border-border/30 last:border-b-0 hover:bg-secondary/40 transition-colors duration-200 rounded-lg">
                        <div>
                          <div className="font-medium">{day.date}</div>
                          <div className="text-sm text-muted-foreground">{day.trades} עסקאות</div>
                        </div>
                        <div className={`text-lg font-semibold flex items-center ${day.profit >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
                          {day.profit >= 0 ? (
                            <>
                              <ArrowUp size={16} className="mr-1" />
                              +{day.profit.toFixed(2)}$
                            </>
                          ) : (
                            <>
                              <ArrowDown size={16} className="mr-1" />
                              {day.profit.toFixed(2)}$
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
          
          {/* Economic Calendar Section - Modern styling */}
          <div className="mt-8">
            <Card className="glass-card-2025 overflow-hidden hover-glow">
              <CardHeader className="pb-2 bg-gradient-to-r from-background to-background/50">
                <CardTitle className="text-xl flex items-center gap-2">
                  <LineChart size={18} className="text-primary" />
                  <span className="neon-text">אירועים כלכליים השבוע</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="overflow-hidden rounded-lg border border-border/30 shadow-inner bg-white/50 dark:bg-black/20">
                  <iframe 
                    src="https://sslecal2.investing.com?ecoDayBackground=%230066ff&defaultFont=%230066ff&innerBorderColor=%238e989e&borderColor=%230066ff&columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=2,3&features=datepicker,timezone,timeselector,filters&countries=23,5&calType=week&timeZone=8&lang=1" 
                    width="100%" 
                    height="450" 
                    frameBorder="0" 
                    allowTransparency={true}
                    className="mx-auto"
                  ></iframe>
                  <div className="text-center py-2 px-4 text-xs text-muted-foreground">
                    <span>
                      Economic Calendar provided by <a href="https://www.investing.com/" rel="nofollow" target="_blank" className="text-primary hover:underline">Investing.com</a>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Calendar;
