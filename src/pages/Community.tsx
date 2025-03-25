
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ChevronUp, MessageSquare, Share2, ThumbsUp } from 'lucide-react';

const CommunityPage = () => {
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">Community</h1>
        
        <Tabs defaultValue="trending">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="trending">Trending</TabsTrigger>
              <TabsTrigger value="recent">Recent</TabsTrigger>
              <TabsTrigger value="following">Following</TabsTrigger>
            </TabsList>
            <Button>Share a Trade</Button>
          </div>
          
          <TabsContent value="trending" className="space-y-6">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <CardHeader className="bg-gray-50 border-b border-gray-200 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={`https://i.pravatar.cc/40?img=${i + 10}`} alt="User" />
                        <AvatarFallback>U{i}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base font-medium">
                          {i % 2 === 0 ? 'Alex Trader' : 'Morgan Investor'}
                        </CardTitle>
                        <p className="text-xs text-gray-500">Posted 2 hours ago</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Follow</Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="mb-4">
                    <h3 className="font-medium mb-2">
                      {i % 2 === 0 ? 'AAPL Long - Gap and Go Strategy' : 'TSLA Short - Resistance Rejection'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {i % 2 === 0 
                        ? 'Great momentum play on AAPL today after the earnings beat. Caught the morning gap and rode the trend until mid-day.' 
                        : 'Shorted TSLA at key resistance level with increasing volume. Took profit at previous support zone.'}
                    </p>
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold">
                          {i % 2 === 0 ? 'AAPL' : 'TSLA'} 
                          <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-600">
                            {i % 2 === 0 ? 'Long' : 'Short'}
                          </span>
                        </span>
                        <span className={i % 2 === 0 ? 'text-tradervue-green font-bold' : 'text-tradervue-red font-bold'}>
                          {i % 2 === 0 ? '+$2,340.50' : '-$1,250.75'}
                        </span>
                      </div>
                      <div className="h-32 bg-gray-100 rounded flex items-center justify-center">
                        <svg viewBox="0 0 300 100" className="w-full h-full">
                          <path
                            d={i % 2 === 0 
                              ? "M0,80 C20,70 40,50 60,45 C80,40 100,45 120,35 C140,25 160,15 180,25 C200,35 220,15 240,5 C260,0 280,10 300,20" 
                              : "M0,20 C20,25 40,35 60,55 C80,65 100,75 120,85 C140,90 160,80 180,70 C200,65 220,75 240,65 C260,55 280,60 300,50"}
                            fill="none"
                            stroke={i % 2 === 0 ? "#22c55e" : "#ef4444"}
                            strokeWidth="2"
                          />
                        </svg>
                      </div>
                      <div className="flex gap-2 mt-2 text-xs text-gray-500">
                        <span>Jun 12, 2024</span>
                        <span>•</span>
                        <span>{i % 2 === 0 ? '150' : '75'} shares</span>
                        <span>•</span>
                        <span>Duration: {i % 2 === 0 ? '2h 15m' : '45m'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-4">
                      <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                        <ThumbsUp size={16} />
                        <span className="text-sm">{i * 12 + 24}</span>
                      </button>
                      <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                        <MessageSquare size={16} />
                        <span className="text-sm">{i * 5 + 3}</span>
                      </button>
                    </div>
                    <button className="flex items-center gap-1 text-gray-500 hover:text-gray-700">
                      <Share2 size={16} />
                      <span className="text-sm">Share</span>
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="flex justify-center">
              <Button variant="outline" className="gap-2">
                <ChevronUp size={16} />
                Load More
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="recent">
            <div className="text-center py-10">
              <h3 className="text-lg font-medium mb-2">Recent activity will appear here</h3>
              <p className="text-gray-500">Follow traders to see their most recent shared trades</p>
            </div>
          </TabsContent>
          
          <TabsContent value="following">
            <div className="text-center py-10">
              <h3 className="text-lg font-medium mb-2">You're not following anyone yet</h3>
              <p className="text-gray-500 mb-4">Follow traders to see their shared trades in your feed</p>
              <Button>Discover Traders</Button>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default CommunityPage;
