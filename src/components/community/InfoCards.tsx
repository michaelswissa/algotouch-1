
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Award } from 'lucide-react';

export function InfoCards() {
  return (
    <>
      {/* User level explanation */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">איך עובדת המערכת?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center">
                <Award className="h-5 w-5 text-primary mr-2" /> 
                <h3 className="font-medium">צבירת נקודות ותגים</h3>
              </div>
              <p className="text-muted-foreground">
                צבור נקודות על ידי פרסום תוכן, קבלת לייקים ופעילות יומיומית בקהילה. תגים חדשים יפתחו ככל שתצבור יותר נקודות.
              </p>
            </div>
            
            <div className="pt-2">
              <h4 className="font-medium mb-1">פעולות ונקודות</h4>
              <ul className="space-y-1">
                <li className="flex justify-between">
                  <span className="text-muted-foreground">פרסום פוסט</span>
                  <span className="font-medium">10 נקודות</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">קבלת לייק</span>
                  <span className="font-medium">5 נקודות</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">כניסה יומית</span>
                  <span className="font-medium">2 נקודות</span>
                </li>
                <li className="flex justify-between">
                  <span className="text-muted-foreground">השלמת פרופיל</span>
                  <span className="font-medium">15 נקודות</span>
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Events card */}
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
    </>
  );
}
