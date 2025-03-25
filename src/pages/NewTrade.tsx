
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
        <h1 className="text-3xl font-bold mb-6">עסקה חדשה</h1>
        
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>הזנת פרטי עסקה</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="manual">
              <TabsList className="mb-6">
                <TabsTrigger value="manual">הזנה ידנית</TabsTrigger>
                <TabsTrigger value="import">ייבוא עסקה</TabsTrigger>
                <TabsTrigger value="snapshot">צילום מסך</TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="symbol">סמל</Label>
                    <Input id="symbol" placeholder="למשל AAPL" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="side">כיוון</Label>
                    <Select defaultValue="long">
                      <SelectTrigger>
                        <SelectValue placeholder="בחר כיוון" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date">תאריך</Label>
                    <div className="relative">
                      <Input id="date" placeholder="בחר תאריך" />
                      <Calendar size={16} className="absolute left-3 top-2.5 text-gray-500" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="entry-price">מחיר כניסה</Label>
                    <Input id="entry-price" placeholder="0.00" type="number" step="0.01" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="exit-price">מחיר יציאה</Label>
                    <Input id="exit-price" placeholder="0.00" type="number" step="0.01" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shares">מניות/חוזים</Label>
                    <Input id="shares" placeholder="0" type="number" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags">תגיות</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר תגיות" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="momentum">מומנטום</SelectItem>
                        <SelectItem value="swing">סווינג</SelectItem>
                        <SelectItem value="earnings">רווחים</SelectItem>
                        <SelectItem value="breakout">פריצה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="strategy">אסטרטגיה</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר אסטרטגיה" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gap-and-go">Gap and Go</SelectItem>
                        <SelectItem value="breakout">פריצה</SelectItem>
                        <SelectItem value="vwap-reversal">היפוך VWAP</SelectItem>
                        <SelectItem value="pullback">נסיגה</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="profit-loss">רווח/הפסד</Label>
                    <Input id="profit-loss" placeholder="0.00" className="text-tradervue-green" readOnly />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes">הערות עסקה</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="הזן את הערות העסקה שלך כאן. מה הייתה התזה שלך? מה הצליח או נכשל?" 
                    className="min-h-[150px]"
                  />
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button variant="outline">ביטול</Button>
                  <Button>שמור עסקה</Button>
                </div>
              </TabsContent>
              
              <TabsContent value="import">
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium mb-2">ייבוא עסקאות מהברוקר</h3>
                  <p className="text-gray-500 mb-6">העלה את ביצועי העסקאות שלך או התחבר לחשבון הברוקר שלך</p>
                  <div className="flex justify-center gap-4">
                    <Button>התחבר לברוקר</Button>
                    <Button variant="outline">העלה CSV</Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="snapshot">
                <div className="text-center py-10">
                  <h3 className="text-lg font-medium mb-2">העלה צילום מסך של העסקה</h3>
                  <p className="text-gray-500 mb-6">גרור ושחרר את תמונת הגרף או אישור העסקה שלך</p>
                  <div className="border-2 border-dashed border-gray-200 rounded-lg p-10 mb-6">
                    <p className="text-gray-400">שחרר קבצים כאן או לחץ כדי להעלות</p>
                  </div>
                  <Button>העלה צילום מסך</Button>
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
