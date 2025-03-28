
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import MonthCalendar from '@/components/MonthCalendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarDays, 
  TrendingUp, 
  LineChart, 
  ArrowUp, 
  ArrowDown, 
  ChevronRight, 
  ChevronLeft 
} from 'lucide-react';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

interface TradeDay {
  date: string;
  trades: number;
  profit: number;
  status: "Open" | "Active";
}

// Hebrew month names
const hebrewMonths = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
];

const Calendar = () => {
  // Current date for default month/year
  const currentDate = new Date();
  const [selectedDate, setSelectedDate] = useState<Date>(currentDate);
  const [currentMonth, setCurrentMonth] = useState(hebrewMonths[currentDate.getMonth()]);
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());

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

  // Convert date string to formatted display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: 'numeric' });
  };

  // Navigate to previous month
  const prevMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
    setCurrentMonth(hebrewMonths[newDate.getMonth()]);
    setCurrentYear(newDate.getFullYear());
  };

  // Navigate to next month
  const nextMonth = () => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
    setCurrentMonth(hebrewMonths[newDate.getMonth()]);
    setCurrentYear(newDate.getFullYear());
  };

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <CalendarDays size={30} className="text-primary" />
            <span className="text-gradient-blue">לוח שנה</span>
          </h1>
          
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-primary/30 text-primary flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                <span className="font-medium">בחר תאריך</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    setSelectedDate(date);
                    setCurrentMonth(hebrewMonths[date.getMonth()]);
                    setCurrentYear(date.getFullYear());
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
        
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
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={prevMonth}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <div className="text-sm font-medium px-3 py-1 rounded-full bg-primary/10 text-primary">
                      {currentMonth} {currentYear}
                    </div>
                    <Button variant="ghost" size="icon" onClick={nextMonth}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="flex justify-center">
                    <div className="w-full max-w-md pb-2">
                      <MonthCalendar 
                        month={currentMonth} 
                        year={currentYear} 
                        status="Open" 
                        onDayClick={(day) => console.log(`Selected day: ${day}`)}
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
                  <div className="space-y-0">
                    <Table>
                      <TableBody>
                        {tradeDays.slice(0, 5).map((day, index) => (
                          <TableRow key={index} className="hover:bg-secondary/40 cursor-pointer">
                            <TableCell className="text-right font-medium">
                              {formatDate(day.date)}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {day.trades} עסקאות
                            </TableCell>
                            <TableCell className={cn(
                              "text-left font-semibold",
                              day.profit >= 0 ? 'text-tradervue-green' : 'text-tradervue-red'
                            )}>
                              <div className="flex items-center justify-end gap-1">
                                {day.profit >= 0 ? (
                                  <>
                                    <span>+{day.profit.toFixed(2)}$</span>
                                    <ArrowUp size={14} />
                                  </>
                                ) : (
                                  <>
                                    <span>{day.profit.toFixed(2)}$</span>
                                    <ArrowDown size={14} />
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
