
import React from 'react';
import Layout from '@/components/Layout';
import Courses from '@/components/Courses';
import ChatBot from '@/components/ChatBot';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  // Mock news data
  const newsItems = [
    { id: 1, title: "שוק המניות האמריקאי במגמת עלייה משמעותית", time: "לפני שעה", source: "מרקר" },
    { id: 2, title: "חברת אפל משיקה סדרת מוצרים חדשה", time: "לפני 3 שעות", source: "גלובס" },
    { id: 3, title: "הפד מודיע על שינוי במדיניות הריבית", time: "לפני 5 שעות", source: "כלכליסט" },
  ];

  // Mock stock indices data
  const stockIndices = [
    { id: "S&P500", value: "5,246.67", change: "+0.63%", isPositive: true },
    { id: "Nasdaq", value: "16,742.39", change: "+0.81%", isPositive: true },
    { id: "Dow Jones", value: "38,836.50", change: "-0.18%", isPositive: false },
    { id: "Tel Aviv 35", value: "1,995.38", change: "+1.24%", isPositive: true },
    { id: "Bitcoin", value: "70,412.08", change: "+1.92%", isPositive: true },
    { id: "Gold", value: "2,325.76", change: "+0.33%", isPositive: true },
  ];

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">לוח בקרה</h1>
        
        {/* News Section - First */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">חדשות שוק ההון</h2>
          <Card>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {newsItems.map(news => (
                  <div key={news.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <h3 className="font-medium text-gray-900">{news.title}</h3>
                    <div className="flex items-center justify-between mt-2 text-sm text-gray-500">
                      <span>{news.source}</span>
                      <span>{news.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Stock Indices Section - Second */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">מדדים בזמן אמת</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stockIndices.map(index => (
              <Card key={index.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-gray-800">{index.id}</h3>
                      <p className="text-2xl font-medium">{index.value}</p>
                    </div>
                    <div className={`text-lg ${index.isPositive ? 'text-[#0299FF]' : 'text-tradervue-red'}`}>
                      {index.change}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Courses Section - Third */}
        <Courses />
        
        {/* AI Chatbot Section - Fourth */}
        <div className="mt-12 mb-8">
          <h2 className="text-xl font-semibold mb-4">בינה מלאכותית - העוזר החכם</h2>
          <ChatBot />
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
