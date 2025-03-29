
/**
 * Generate calendar days for a month grid view
 */
export function generateCalendarDays(month: string, year: number, daysWithStatus: Record<number, 'positive' | 'negative' | 'neutral'>) {
  // Map Hebrew month names to numerical values
  const hebrewMonthsMap: Record<string, number> = {
    'ינואר': 0, 'פברואר': 1, 'מרץ': 2, 'אפריל': 3, 'מאי': 4, 'יוני': 5,
    'יולי': 6, 'אוגוסט': 7, 'ספטמבר': 8, 'אוקטובר': 9, 'נובמבר': 10, 'דצמבר': 11
  };
  
  // Convert Hebrew month to numerical month
  const monthIndex = hebrewMonthsMap[month];
  
  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(year, monthIndex, 1).getDay();
  
  // Adjust for the week starting with Monday in Hebrew calendar (Sunday is 0, so we adjust to 6 for Sunday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // Get the number of days in the month
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  
  // Get the number of days in the previous month
  const prevMonth = new Date(year, monthIndex, 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  // Check if current month/year matches today
  const currentDate = new Date();
  const today = currentDate.getDate();
  const isCurrentMonth = 
    currentDate.getMonth() === monthIndex && 
    currentDate.getFullYear() === year;
  
  // Generate an array of days for the calendar grid
  const calendarDays = [];
  
  // Add days from the previous month
  for (let i = adjustedFirstDay - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, month: 'prev' as const });
  }
  
  // Add days from the current month
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ 
      day: i, 
      month: 'current' as const, 
      status: daysWithStatus[i] || 'neutral',
      isToday: isCurrentMonth && today === i
    });
  }
  
  // Add days from the next month to complete the grid (up to 6 rows)
  // Calculate how many days are needed to fill all rows
  const daysToAdd = 42 - calendarDays.length; // 6 rows x 7 days = 42
  
  // Add only enough days to complete the grid rows
  for (let i = 1; i <= daysToAdd; i++) {
    calendarDays.push({ day: i, month: 'next' as const });
  }
  
  return calendarDays;
}
