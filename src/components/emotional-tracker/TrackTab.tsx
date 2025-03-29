
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import EmotionButtons from './EmotionButtons';

interface TrackTabProps {
  selectedEmotion: string;
  setSelectedEmotion: (emotion: string) => void;
}

const TrackTab: React.FC<TrackTabProps> = ({ 
  selectedEmotion, 
  setSelectedEmotion 
}) => {
  return (
    <Card className="hover-glow">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">מעקב וניתוח רגשי יומי</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Emotional Check-in Section */}
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm mb-4">איך אתה מרגיש היום לפני תחילת המסחר?</p>
            
            <EmotionButtons
              selectedEmotion={selectedEmotion}
              setSelectedEmotion={setSelectedEmotion}
            />
            
            <div className="pt-4">
              <Label htmlFor="emotionNotes" className="block mb-2">הערות נוספות</Label>
              <Textarea
                id="emotionNotes"
                placeholder="תאר את מצב הרוח והרגשות שלך בצורה חופשית..."
                className="h-24"
              />
            </div>
          </div>
          
          {/* Daily Reflection Section */}
          <div className="space-y-4">
            <div>
              <Label className="block mb-2">דירוג יום המסחר</Label>
              <ToggleGroup type="single" className="justify-between">
                <ToggleGroupItem value="very-negative" className="flex-1">גרוע מאוד</ToggleGroupItem>
                <ToggleGroupItem value="negative" className="flex-1">גרוע</ToggleGroupItem>
                <ToggleGroupItem value="neutral" className="flex-1">סביר</ToggleGroupItem>
                <ToggleGroupItem value="positive" className="flex-1">טוב</ToggleGroupItem>
                <ToggleGroupItem value="very-positive" className="flex-1">מצוין</ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div>
              <Label className="block mb-2">האם עקבת אחר תוכנית המסחר שלך?</Label>
              <ToggleGroup type="single" className="justify-between">
                <ToggleGroupItem value="completely" className="flex-1">לחלוטין</ToggleGroupItem>
                <ToggleGroupItem value="mostly" className="flex-1">ברובה</ToggleGroupItem>
                <ToggleGroupItem value="partially" className="flex-1">חלקית</ToggleGroupItem>
                <ToggleGroupItem value="rarely" className="flex-1">מעט</ToggleGroupItem>
                <ToggleGroupItem value="not-at-all" className="flex-1">בכלל לא</ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="dailyReflection" className="block mb-2">רפלקציה יומית</Label>
            <Textarea
              id="dailyReflection"
              placeholder="תאר את החוויה הרגשית שלך במהלך יום המסחר. מה השפיע על הרגשות שלך? אילו החלטות היו מושפעות מרגשות?"
              className="h-32"
            />
          </div>
          
          <div>
            <Label className="block mb-2">תובנות עיקריות מהיום</Label>
            <Textarea
              placeholder="מה למדת על עצמך היום? אילו דפוסים זיהית? מה תעשה אחרת מחר?"
              className="h-24"
            />
          </div>
          
          <Button className="w-full mt-2 bg-primary">שמור מעקב יומי</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrackTab;
