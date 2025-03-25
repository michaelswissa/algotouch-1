
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const Dashboard = () => {
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Today's Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-tradervue-green">+$1,245.67</p>
              <p className="text-sm text-gray-500 mt-1">5 trades</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Weekly Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-tradervue-green">+$5,678.90</p>
              <p className="text-sm text-gray-500 mt-1">23 trades</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Win Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">68%</p>
              <p className="text-sm text-gray-500 mt-1">Last 30 days</p>
            </CardContent>
          </Card>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium">AAPL {i % 2 === 0 ? 'Long' : 'Short'}</p>
                      <p className="text-sm text-gray-500">June {i + 10}, 2024</p>
                    </div>
                    <div className={i % 2 === 0 ? 'text-tradervue-green' : 'text-tradervue-red'}>
                      {i % 2 === 0 ? '+' : '-'}${(Math.random() * 1000).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">Performance by Symbol</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'].map((symbol, i) => (
                  <div key={symbol} className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div>
                      <p className="font-medium">{symbol}</p>
                      <p className="text-sm text-gray-500">{Math.floor(Math.random() * 20) + 5} trades</p>
                    </div>
                    <div className={i % 3 === 0 ? 'text-tradervue-red' : 'text-tradervue-green'}>
                      {i % 3 === 0 ? '-' : '+'}${(Math.random() * 5000).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
