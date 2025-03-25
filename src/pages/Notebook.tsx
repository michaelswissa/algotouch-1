
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, Folder } from 'lucide-react';

const NotebookPage = () => {
  const categories = [
    {
      name: 'Trading Strategies',
      notes: [
        { title: 'Gap and Go Strategy', date: 'May 15, 2024' },
        { title: 'VWAP Bounce Play', date: 'April 28, 2024' },
        { title: 'Breakout Strategy', date: 'March 20, 2024' },
      ]
    },
    {
      name: 'Market Analysis',
      notes: [
        { title: 'SPY Weekly Analysis', date: 'June 10, 2024' },
        { title: 'Sector Rotation Notes', date: 'May 30, 2024' },
      ]
    },
    {
      name: 'Trade Reviews',
      notes: [
        { title: 'AAPL Trade - June 2024', date: 'June 5, 2024' },
        { title: 'TSLA Failed Setup', date: 'May 22, 2024' },
        { title: 'MSFT Earnings Play', date: 'April 26, 2024' },
        { title: 'AMD Momentum Trade', date: 'April 15, 2024' },
      ]
    }
  ];

  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Notebook</h1>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Folder size={16} />
              New Folder
            </Button>
            <Button className="gap-2">
              <Plus size={16} />
              New Note
            </Button>
          </div>
        </div>

        <div className="space-y-8">
          {categories.map((category, i) => (
            <div key={i}>
              <div className="flex items-center gap-2 mb-3">
                <Folder size={18} className="text-gray-500" />
                <h2 className="text-lg font-medium">{category.name}</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.notes.map((note, j) => (
                  <Card key={j} className="hover:shadow-md transition-shadow">
                    <CardHeader className="p-4 pb-2">
                      <div className="flex items-start gap-2">
                        <FileText size={18} className="text-gray-500 mt-0.5" />
                        <div>
                          <CardTitle className="text-base font-medium">{note.title}</CardTitle>
                          <p className="text-xs text-gray-500 mt-1">{note.date}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 pt-2">
                      <p className="text-sm text-gray-600 line-clamp-2">
                        Notes on {note.title.toLowerCase()} including key levels, entry and exit criteria, 
                        and important observations from previous trades.
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default NotebookPage;
