
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const JournalPage = () => {
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Journal</h1>
          <Button className="gap-2">
            <Plus size={16} />
            New Journal Entry
          </Button>
        </div>
        
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="overflow-hidden">
              <CardHeader className="bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-medium">Trading Journal - June {10 + i}, 2024</CardTitle>
                  <span className="text-sm text-gray-500">Last edited: 2 hours ago</span>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-gray-800 mb-4">
                  Today was a {i % 2 === 0 ? 'good' : 'challenging'} trading day. I {i % 2 === 0 ? 'made some solid trades' : 'made some mistakes but learned from them'}.
                </p>
                <p className="text-gray-800 mb-4">
                  Market conditions: {i % 2 === 0 ? 'Bullish trend with strong momentum' : 'Choppy with high volatility'}.
                </p>
                <h3 className="text-lg font-medium mb-2">Key Observations:</h3>
                <ul className="list-disc pl-5 mb-4">
                  <li className="mb-1">AAPL showed strong momentum in the morning session</li>
                  <li className="mb-1">TSLA broke out above resistance after earnings</li>
                  <li className="mb-1">SPY had high volume at key support levels</li>
                </ul>
                <h3 className="text-lg font-medium mb-2">What Worked:</h3>
                <p className="text-gray-800 mb-4">
                  {i % 2 === 0 
                    ? 'Waiting for confirmation before entering trades. Sticking to my trading plan.' 
                    : 'Taking profits at predetermined levels. Cutting losses quickly.'}
                </p>
                <h3 className="text-lg font-medium mb-2">What Didn't Work:</h3>
                <p className="text-gray-800 mb-4">
                  {i % 2 === 0 
                    ? 'Getting out of profitable trades too early. Need to let winners run more.' 
                    : 'Chasing momentum stocks after big moves. Need more patience.'}
                </p>
                <div className="flex justify-end">
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default JournalPage;
