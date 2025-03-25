
import React, { useState } from 'react';
import Layout from '@/components/Layout';
import TradeFilters from '@/components/TradeFilters';
import ReportTabs from '@/components/ReportTabs';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import MonthCalendar from '@/components/MonthCalendar';

const CalendarPage = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [calendarView, setCalendarView] = useState('calendar');

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">Calendar</h1>
        
        <TradeFilters />
        
        <ReportTabs activeTab={activeTab} onTabChange={setActiveTab} />
        
        <PerformanceMetrics />
        
        <div className="mb-6">
          <div className="flex border border-gray-200 rounded-md overflow-hidden w-fit">
            <button 
              className={`px-4 py-2 text-sm font-medium ${calendarView === 'recent' ? 'bg-white' : 'bg-gray-100'}`}
              onClick={() => setCalendarView('recent')}
            >
              Recent
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${calendarView === 'year-month-day' ? 'bg-white' : 'bg-gray-100'}`}
              onClick={() => setCalendarView('year-month-day')}
            >
              Year/Month/Day
            </button>
            <button 
              className={`px-4 py-2 text-sm font-medium ${calendarView === 'calendar' ? 'bg-white' : 'bg-gray-100'}`}
              onClick={() => setCalendarView('calendar')}
            >
              Calendar
            </button>
          </div>
        </div>
        
        <div className="mb-6 flex justify-end">
          <div className="flex border border-gray-200 rounded-md overflow-hidden">
            <button className="px-4 py-1 text-sm">2021</button>
            <button className="px-4 py-1 text-sm">2022</button>
            <button className="px-4 py-1 text-sm">2023</button>
            <button className="px-4 py-1 text-sm font-medium bg-gray-100">2024</button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <MonthCalendar month="January" year={2024} status="Open" />
          <MonthCalendar month="February" year={2024} status="Active" />
          <MonthCalendar month="March" year={2024} status="Open" />
        </div>
      </div>
    </Layout>
  );
};

export default CalendarPage;
