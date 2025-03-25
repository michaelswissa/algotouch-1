
import React from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageSquare, ThumbsUp, Share2, Users, Award } from 'lucide-react';

const Community = () => {
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">קהילה</h1>
          <Button className="gap-2">
            <Users size={16} />
            הצטרף לקהילה
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main discussions column */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-xl font-semibold">דיונים אחרונים</h2>
            
            {/* Discussion post */}
            {[1, 2, 3].map(i => (
              <Card key={i} className="overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://i.pravatar.cc/150?img=${20 + i}`} />
                      <AvatarFallback>U{i}</AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <div>
                          <h3 className="font-medium">סוחר{i}@</h3>
                          <p className="text-sm text-gray-500">לפני {i} שעות</p>
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <h4 className="font-semibold text-lg mb-2">
                          {i === 1 ? "מה דעתכם על התנועה של AAPL היום?" :
                           i === 2 ? "אסטרטגיה חדשה שאני בוחן למניות טכנולוגיה" :
                           "הודעה חשובה למשקיעים לטווח ארוך"}
                        </h4>
                        <p className="text-gray-700">
                          {i === 1 ? "שמתם לב לתנועה המשמעותית היום? אני חושב שזה בגלל..." :
                           i === 2 ? "אני בוחן אסטרטגיה חדשה לטווח הקצר שמתמקדת בתנועות מחיר בקצב מהיר..." :
                           "לאחרונה חקרתי את האתגרים של השקעות ארוכות טווח בשוק הנוכחי והגעתי לכמה תובנות..."}
                        </p>
                      </div>
                      
                      <div className="flex mt-4 gap-4">
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <ThumbsUp size={16} /> {Math.floor(Math.random() * 20) + 5}
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <MessageSquare size={16} /> {Math.floor(Math.random() * 10) + 2}
                        </Button>
                        <Button variant="ghost" size="sm" className="flex items-center gap-1">
                          <Share2 size={16} /> שתף
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* Sidebar */}
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">מידע קהילתי</h2>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">חברי קהילה מובילים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`https://i.pravatar.cc/150?img=${10 + i}`} />
                        <AvatarFallback>T{i}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <p className="font-medium text-sm">מנטור{i}@</p>
                        <p className="text-xs text-gray-500">
                          {i === 1 ? "456 פוסטים" : i === 2 ? "328 פוסטים" : "215 פוסטים"}
                        </p>
                      </div>
                      <Award className="h-5 w-5 text-amber-500" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-base">אירועים קרובים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-md p-3">
                    <p className="font-medium">וובינר: אסטרטגיות מסחר לשוק תנודתי</p>
                    <p className="text-sm text-gray-500 mt-1">21 ביוני, 19:00</p>
                    <Button variant="outline" size="sm" className="mt-2 w-full">הירשם</Button>
                  </div>
                  
                  <div className="border border-gray-200 rounded-md p-3">
                    <p className="font-medium">מפגש קהילה: שיתוף אסטרטגיות</p>
                    <p className="text-sm text-gray-500 mt-1">28 ביוני, 20:00</p>
                    <Button variant="outline" size="sm" className="mt-2 w-full">הירשם</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Community;
