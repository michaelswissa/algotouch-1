
import { TradeRecord } from '@/lib/trade-analysis';

/**
 * Generates calendar days for a specific month
 */
export function generateCalendarDays(
  month: string,
  year: number,
  tradesData: Record<string, TradeRecord[]>
) {
  // Hebrew month names
  const hebrewMonths = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'
  ];
  
  // Get current date for "today" highlighting
  const today = new Date();
  
  // Get month index (0-11)
  const monthIndex = hebrewMonths.indexOf(month);
  
  // First day of month
  const firstDay = new Date(year, monthIndex, 1);
  
  // Last day of month
  const lastDay = new Date(year, monthIndex + 1, 0);
  
  // Day of week of first day (0 = Sunday, 1 = Monday, ...)
  // Convert to match Hebrew calendar where week starts with Monday (0 = Monday)
  let firstDayOfWeek = firstDay.getDay();
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
  
  // Number of days in month
  const daysInMonth = lastDay.getDate();
  
  // Number of days in previous month
  const prevMonth = new Date(year, monthIndex, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  // Calendar Array (6 weeks x 7 days)
  const calendar = [];
  
  // Add previous month days
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendar.push({
      day: daysInPrevMonth - firstDayOfWeek + i + 1,
      month: 'prev',
    });
  }
  
  // Add current month days
  for (let i = 1; i <= daysInMonth; i++) {
    const isToday = 
      today.getDate() === i && 
      today.getMonth() === monthIndex && 
      today.getFullYear() === year;
      
    // Check for real trade data
    const dayKey = `${i}-current`;
    const hasTrades = tradesData && tradesData[dayKey] && tradesData[dayKey].length > 0;
    const dailyProfit = hasTrades ? tradesData[dayKey].reduce((sum, trade) => sum + (trade.Net || 0), 0) : 0;
      
    calendar.push({
      day: i,
      month: 'current',
      isToday,
      status: hasTrades ? (dailyProfit > 0 ? 'positive' : 'negative') : 'neutral'
    });
  }
  
  // Add next month days
  const remainingDays = 42 - calendar.length; // 6x7 grid
  for (let i = 1; i <= remainingDays; i++) {
    calendar.push({
      day: i,
      month: 'next',
    });
  }
  
  return calendar;
}
