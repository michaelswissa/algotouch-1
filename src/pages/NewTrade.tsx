
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';

const NewTradePage = () => {
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <h1 className="text-3xl font-bold mb-6">New Trade</h1>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Enter Trade Details</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="mb-6">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="import">Import Trade</TabsTrigger>
                <TabsTrigger value="snapshot">Screenshot</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input id="symbol" placeholder="e.g. AAPL" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="side">Side</Label>
                    <Select defaultValue="long">
                      <SelectTrigger>
                        <SelectValue placeholder="Select side" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <div className="relative">
                      <Input id="date" placeholder="Select date" />
                      <Calendar size={16} className="absolute right-3 top-2.5 text-gray-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="entry-price">Entry Price</Label>
                    <Input id="entry-price" placeholder="0.00" type="number" step="0.01" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="exit-price">Exit Price</Label>
                    <Input id="exit-price" placeholder="0.00" type="number" step="0.01" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shares">Shares/Contracts</Label>
                    <Input id="shares" placeholder="0" type="number" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">Tags</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tags" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="momentum">Momentum</SelectItem>
                        <SelectItem value="swing">Swing</SelectItem>
                        <SelectItem value="earnings">Earnings</SelectItem>
                        <SelectItem value="breakout">Breakout</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="strategy">Strategy</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select strategy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gap-and-go">Gap and Go</SelectItem>
                        <SelectItem value="breakout">Breakout</SelectItem>
                        <SelectItem value="vwap-reversal">VWAP Reversal</SelectItem>
                        <SelectItem value="pullback">Pullback</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profit-loss">Profit/Loss</Label>
                    <Input id="profit-loss" placeholder="0.00" className="text-tradervue-green" readOnly />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">Trade Notes</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="Enter your trade notes here. What was your thesis? What went well or poorly?" 
                    className="min-h-[150px]"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button variant="outline">Cancel</Button>
                  <Button>Save Trade</Button>
                </div>
              </TabsContent>
              
              <TabsContent value="import">
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium mb-2">Import Trades from Broker</h3>
                  <p className="text-gray-500 mb-6">Upload your trade executions or connect your brokerage account</p>
                  <div className="flex justify-center gap-4">
                    <Button>Connect Broker</Button>
                    <Button variant="outline">Upload CSV</Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="snapshot">
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium mb-2">Upload Trade Screenshot</h3>
                  <p className="text-gray-500 mb-6">Drag and drop your chart or trade confirmation image</p>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 mb-6">
                    <p className="text-gray-400">Drop files here or click to upload</p>
                  </div>
                  <Button>Upload Screenshot</Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default NewTradePage;
