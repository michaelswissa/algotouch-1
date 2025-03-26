
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import MonthCalendar from '@/components/MonthCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, TrendingUp, TrendingDown } from 'lucide-react';

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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="elevated-card">
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
                <MonthCalendar 
                  month={currentMonth} 
                  year={currentYear} 
                  status="Open" 
                />
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card className="elevated-card h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-xl flex items-center gap-2">
                  <TrendingUp size={18} className="text-primary" />
                  פעילות אחרונה
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tradeDays.slice(0, 5).map((day, index) => (
                    <div key={index} className="flex items-center justify-between pb-3 border-b border-border last:border-b-0 hover:bg-secondary/30 transition-colors duration-200 p-2 rounded-md">
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
      </div>
    </Layout>
  );
};

export default Calendar;
