
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import MonthCalendar from '@/components/MonthCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, TrendingUp, TrendingDown, LineChart } from 'lucide-react';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active"; // Using allowed types
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
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-2">
          <CalendarDays size={28} className="text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">לוח שנה</span>
        </h1>
        
        <div className="flex flex-col max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Column - Centered */}
            <div className="lg:col-span-2">
              <Card className="glass-card-2025">
                <CardHeader className="pb-2 flex flex-row items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <CalendarDays size={18} className="text-primary" />
                    לוח שנה מסחר
                  </CardTitle>
                  <div className="text-sm text-muted-foreground">
                    {currentMonth} {currentYear}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-center">
                    <div className="w-full max-w-md">
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
            
            {/* Recent Activity */}
            <div>
              <Card className="glass-card-2025 h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xl flex items-center gap-2">
                    <TrendingUp size={18} className="text-primary" />
                    פעילות אחרונה
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {tradeDays.slice(0, 5).map((day, index) => (
                      <div key={index} className="flex items-center justify-between pb-3 border-b border-border/30 last:border-b-0 hover:bg-secondary/30 transition-colors duration-200 p-2 rounded-md">
                        <div>
                          <div className="font-medium">{day.date}</div>
                          <div className="text-sm text-muted-foreground">{day.trades} עסקאות</div>
                        </div>
                        <div className={`text-lg font-semibold flex items-center ${day.profit >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'}`}>
                          {day.profit >= 0 ? (
                            <>
                              <TrendingUp size={16} className="mr-1" />
                              +{day.profit.toFixed(2)}$
                            </>
                          ) : (
                            <>
                              <TrendingDown size={16} className="mr-1" />
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
          
          {/* Economic Calendar Section - Centered */}
          <div className="mt-8 max-w-5xl mx-auto">
            <Card className="glass-card-2025">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <LineChart size={18} className="text-primary" />
                  אירועים כלכליים השבוע
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center">
                  <div className="overflow-hidden rounded-md max-w-4xl w-full">
                    <iframe 
                      src="https://sslecal2.investing.com?ecoDayBackground=%23039aff&defaultFont=%23039aff&innerBorderColor=%238e989e&borderColor=%23039aff&columns=exc_flags,exc_currency,exc_importance,exc_actual,exc_forecast,exc_previous&importance=2,3&features=datepicker,timezone,timeselector,filters&countries=23,5&calType=week&timeZone=8&lang=1" 
                      width="100%" 
                      height="467" 
                      frameBorder="0" 
                      allowTransparency={true}
                      className="mx-auto"
                    ></iframe>
                    <div className="poweredBy text-center mt-2" style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      <span style={{ fontSize: '11px', color: '#333333' }}>
                        Real Time Economic Calendar provided by <a href="https://www.investing.com/" rel="nofollow" target="_blank" style={{ fontSize: '11px', color: '#06529D', fontWeight: 'bold' }} className="underline_link">Investing.com</a>.
                      </span>
                    </div>
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
