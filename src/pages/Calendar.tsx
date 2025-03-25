
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import MonthCalendar from '@/components/MonthCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">לוח שנה</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>לוח שנה מסחר</CardTitle>
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
            <Card>
              <CardHeader>
                <CardTitle>פעילות אחרונה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tradeDays.slice(0, 5).map((day, index) => (
                    <div key={index} className="flex items-center justify-between pb-2 border-b border-gray-100 last:border-b-0">
                      <div>
                        <div className="font-medium">{day.date}</div>
                        <div className="text-sm text-gray-500">{day.trades} עסקאות</div>
                      </div>
                      <div className={`text-lg font-semibold ${day.profit >= 0 ? 'text-[#0299FF]' : 'text-red-500'}`}>
                        {day.profit >= 0 ? '+' : ''}{day.profit.toFixed(2)}$
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
