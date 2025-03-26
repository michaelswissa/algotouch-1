
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Calendar, ArrowLeft, Upload, Tag, ChartLineUp, PieChart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NewTradePage = () => {
  const navigate = useNavigate();
  
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gradient-blue">עסקה חדשה</h1>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2 hover:bg-white/10"
            onClick={() => navigate('/trades')}
          >
            <ArrowLeft size={16} />
            חזרה לעסקאות
          </Button>
        </div>
        
        <Card className="border-white/20 dark:border-white/5 shadow-md overflow-hidden bg-white/90 dark:bg-white/5 backdrop-blur-md">
          <CardHeader className="pb-3 border-b border-white/10">
            <CardTitle className="flex items-center gap-2">
              <ChartLineUp className="text-primary h-5 w-5" />
              הזנת פרטי עסקה
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="w-full justify-start rounded-none border-b border-white/10 p-0 h-auto">
                <TabsTrigger 
                  value="manual" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none rounded-none border-b-2 border-transparent px-6 py-3"
                >
                  הזנה ידנית
                </TabsTrigger>
                <TabsTrigger 
                  value="import" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none rounded-none border-b-2 border-transparent px-6 py-3"
                >
                  ייבוא עסקה
                </TabsTrigger>
                <TabsTrigger 
                  value="snapshot" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:rounded-none rounded-none border-b-2 border-transparent px-6 py-3"
                >
                  צילום מסך
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="p-6 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-sm font-medium text-muted-foreground">סמל</Label>
                    <Input id="symbol" placeholder="למשל AAPL" className="bg-white/50 dark:bg-white/5 border-white/20" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="side" className="text-sm font-medium text-muted-foreground">כיוון</Label>
                    <Select defaultValue="long">
                      <SelectTrigger className="bg-white/50 dark:bg-white/5 border-white/20">
                        <SelectValue placeholder="בחר כיוון" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="long">Long</SelectItem>
                        <SelectItem value="short">Short</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="date" className="text-sm font-medium text-muted-foreground">תאריך</Label>
                    <div className="relative">
                      <Input id="date" placeholder="בחר תאריך" className="bg-white/50 dark:bg-white/5 border-white/20 pr-9" />
                      <Calendar size={16} className="absolute left-3 top-2.5 text-primary/70" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="entry-price" className="text-sm font-medium text-muted-foreground">מחיר כניסה</Label>
                    <Input id="entry-price" placeholder="0.00" type="number" step="0.01" className="bg-white/50 dark:bg-white/5 border-white/20" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="exit-price" className="text-sm font-medium text-muted-foreground">מחיר יציאה</Label>
                    <Input id="exit-price" placeholder="0.00" type="number" step="0.01" className="bg-white/50 dark:bg-white/5 border-white/20" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="shares" className="text-sm font-medium text-muted-foreground">מניות/חוזים</Label>
                    <Input id="shares" placeholder="0" type="number" className="bg-white/50 dark:bg-white/5 border-white/20" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tags" className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <Tag size={14} className="text-primary/70" />
                      תגיות
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-white/50 dark:bg-white/5 border-white/20">
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
                    <Label htmlFor="strategy" className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
                      <PieChart size={14} className="text-primary/70" />
                      אסטרטגיה
                    </Label>
                    <Select>
                      <SelectTrigger className="bg-white/50 dark:bg-white/5 border-white/20">
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
                    <Label htmlFor="profit-loss" className="text-sm font-medium text-muted-foreground">רווח/הפסד</Label>
                    <Input id="profit-loss" placeholder="0.00" className="text-tradervue-green font-medium bg-white/50 dark:bg-white/5 border-white/20" readOnly />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="notes" className="text-sm font-medium text-muted-foreground">הערות עסקה</Label>
                  <Textarea 
                    id="notes" 
                    placeholder="הזן את הערות העסקה שלך כאן. מה הייתה התזה שלך? מה הצליח או נכשל?" 
                    className="min-h-[150px] bg-white/50 dark:bg-white/5 border-white/20"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                  <Button variant="outline" className="border-white/20 hover:bg-white/10">ביטול</Button>
                  <Button className="bg-primary hover:bg-primary/90">שמור עסקה</Button>
                </div>
              </TabsContent>
              
              <TabsContent value="import" className="p-6">
                <div className="text-center py-12">
                  <Upload className="h-14 w-14 mx-auto text-primary/40 mb-4" />
                  <h3 className="text-xl font-medium mb-2">ייבוא עסקאות מהברוקר</h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">העלה את ביצועי העסקאות שלך או התחבר לחשבון הברוקר שלך</p>
                  <div className="flex justify-center gap-4">
                    <Button className="bg-primary hover:bg-primary/90 shadow-sm px-6">התחבר לברוקר</Button>
                    <Button variant="outline" className="border-white/20 hover:bg-white/10 px-6">העלה CSV</Button>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="snapshot" className="p-6">
                <div className="text-center py-12">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse-subtle blur-md"></div>
                    <Upload className="h-14 w-14 mx-auto text-primary/50 relative z-10" />
                  </div>
                  <h3 className="text-xl font-medium mb-2">העלה צילום מסך של העסקה</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">גרור ושחרר את תמונת הגרף או אישור העסקה שלך</p>
                  <div className="border-2 border-dashed border-white/20 rounded-lg p-12 mb-6 transition-all duration-300 hover:border-primary/30 mx-auto max-w-xl">
                    <p className="text-muted-foreground">שחרר קבצים כאן או לחץ כדי להעלות</p>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 shadow-sm px-6">העלה צילום מסך</Button>
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
