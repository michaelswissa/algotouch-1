
/**
 * Generate calendar days for a month grid view
 */
export function generateCalendarDays(month: string, year: number, daysWithStatus: Record<number, 'positive' | 'negative' | 'neutral'>) {
  // Get the first day of the month (0 = Sunday, 1 = Monday, etc.)
  const firstDayOfMonth = new Date(`${month} 1, ${year}`).getDay();
  
  // Adjust for the week starting with Monday in Hebrew calendar (Sunday is 0, so we adjust to 6 for Sunday)
  const adjustedFirstDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
  
  // Get the number of days in the month
  const daysInMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth() + 1, 0).getDate();
  
  // Get the number of days in the previous month
  const prevMonth = new Date(year, new Date(`${month} 1, ${year}`).getMonth(), 0);
  const daysInPrevMonth = prevMonth.getDate();
  
  // Check if current month/year matches today
  const currentDate = new Date();
  const today = currentDate.getDate();
  const isCurrentMonth = 
    currentDate.getMonth() === new Date(`${month} 1, ${year}`).getMonth() && 
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
  
  // Add days from the next month
  const remainingCells = 42 - calendarDays.length; // 6 rows x 7 days = 42 cells
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({ day: i, month: 'next' as const });
  }
  
  return calendarDays;
}
