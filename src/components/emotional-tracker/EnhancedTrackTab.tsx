
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Slider } from '@/components/ui/slider';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CheckCircle2, BrainIcon, AlertTriangleIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import EmotionButtons from './EmotionButtons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { enhancedEmotions } from './data/enhanced-emotions';
import { psychologicalPatterns } from './data/psychological-patterns';

interface EnhancedTrackTabProps {
  selectedEmotion: string;
  setSelectedEmotion: (emotion: string) => void;
}

const EnhancedTrackTab: React.FC<EnhancedTrackTabProps> = ({ 
  selectedEmotion, 
  setSelectedEmotion 
}) => {
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [emotionIntensity, setEmotionIntensity] = useState(5);
  const [emotionNotes, setEmotionNotes] = useState('');
  const [tradingDayRating, setTradingDayRating] = useState('');
  const [followedPlan, setFollowedPlan] = useState('');
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>([]);
  const [preMarketSleep, setPreMarketSleep] = useState('');
  const [stressLevel, setStressLevel] = useState(5);
  const [dailyReflection, setDailyReflection] = useState('');
  const [lessonsLearned, setLessonsLearned] = useState('');
  const { toast } = useToast();

  const handleSaveTracking = () => {
    // Here we would save all the tracking data to a database
    setConfirmDialogOpen(false);
    
    toast({
      title: "נשמר בהצלחה",
      description: "המעקב הרגשי היומי נשמר בהצלחה",
      duration: 3000,
    });
  };

  const getEmotionDescription = () => {
    const emotion = enhancedEmotions.find(e => e.id === selectedEmotion);
    return emotion?.description || '';
  };

  const handlePatternSelect = (patternId: string) => {
    if (!selectedPatterns.includes(patternId)) {
      setSelectedPatterns([...selectedPatterns, patternId]);
    }
  };

  const handlePatternRemove = (patternId: string) => {
    setSelectedPatterns(selectedPatterns.filter(id => id !== patternId));
  };

  return (
    <Card className="hover-glow rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">מעקב וניתוח רגשי יומי</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pre-Market Emotional Check-in Section */}
          <div className="space-y-4">
            <div className="bg-slate-900/10 rounded-md p-4 mb-4 dark:bg-slate-800/40">
              <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                <BrainIcon size={18} className="text-cyan-500" />
                מצב לפני המסחר
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="preMarketSleep" className="block mb-2">איכות השינה אתמול בלילה</Label>
                  <ToggleGroup 
                    type="single" 
                    className="justify-between"
                    value={preMarketSleep}
                    onValueChange={setPreMarketSleep}
                  >
                    <ToggleGroupItem value="poor" className="flex-1">גרועה</ToggleGroupItem>
                    <ToggleGroupItem value="fair" className="flex-1">סבירה</ToggleGroupItem>
                    <ToggleGroupItem value="good" className="flex-1">טובה</ToggleGroupItem>
                    <ToggleGroupItem value="excellent" className="flex-1">מצוינת</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                
                <div>
                  <Label className="block mb-2">רמת לחץ/מתח (1-10)</Label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">נמוכה</span>
                    <Slider
                      value={[stressLevel]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => setStressLevel(value[0])}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">גבוהה</span>
                  </div>
                  <div className="text-center mt-1 text-sm">
                    {stressLevel}
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground text-sm mb-2">איזה רגש דומיננטי מלווה אותך היום?</p>
            
            <EmotionButtons
              selectedEmotion={selectedEmotion}
              setSelectedEmotion={setSelectedEmotion}
            />
            
            {selectedEmotion && (
              <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-md">
                <p className="text-sm text-muted-foreground">{getEmotionDescription()}</p>
                
                <div className="mt-3">
                  <Label className="block mb-2">עוצמת הרגש (1-10)</Label>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">חלשה</span>
                    <Slider
                      value={[emotionIntensity]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => setEmotionIntensity(value[0])}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">חזקה</span>
                  </div>
                  <div className="text-center mt-1 text-sm">
                    {emotionIntensity}
                  </div>
                </div>
              </div>
            )}
            
            <div className="pt-4">
              <Label htmlFor="emotionNotes" className="block mb-2">הערות נוספות לגבי הרגשות</Label>
              <Textarea
                id="emotionNotes"
                placeholder="תאר את מצב הרוח והרגשות שלך בצורה חופשית..."
                className="h-24"
                value={emotionNotes}
                onChange={(e) => setEmotionNotes(e.target.value)}
              />
            </div>
          </div>
          
          {/* Psychological Patterns Recognition */}
          <div className="space-y-4">
            <div className="bg-slate-900/10 rounded-md p-4 mb-4 dark:bg-slate-800/40">
              <h3 className="text-md font-medium flex items-center gap-2 mb-3">
                <AlertTriangleIcon size={18} className="text-amber-500" />
                זיהוי דפוסים פסיכולוגיים
              </h3>
              
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground mb-2">
                  בחר דפוסים פסיכולוגיים שאתה חווה או מזהה היום:
                </p>
                
                <Select onValueChange={handlePatternSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר דפוסים פסיכולוגיים" />
                  </SelectTrigger>
                  <SelectContent>
                    {psychologicalPatterns.map(pattern => (
                      <SelectItem key={pattern.id} value={pattern.id}>
                        {pattern.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedPatterns.map(patternId => {
                    const pattern = psychologicalPatterns.find(p => p.id === patternId);
                    return pattern ? (
                      <div 
                        key={pattern.id}
                        className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 px-3 py-1 rounded-full text-sm flex items-center gap-1"
                      >
                        {pattern.name}
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-5 w-5 rounded-full"
                          onClick={() => handlePatternRemove(pattern.id)}
                        >
                          ✕
                        </Button>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
            
            <div>
              <Label className="block mb-2">הערכת יום המסחר</Label>
              <ToggleGroup 
                type="single" 
                className="justify-between"
                value={tradingDayRating}
                onValueChange={setTradingDayRating}
              >
                <ToggleGroupItem value="very-negative" className="flex-1">גרוע מאוד</ToggleGroupItem>
                <ToggleGroupItem value="negative" className="flex-1">גרוע</ToggleGroupItem>
                <ToggleGroupItem value="neutral" className="flex-1">סביר</ToggleGroupItem>
                <ToggleGroupItem value="positive" className="flex-1">טוב</ToggleGroupItem>
                <ToggleGroupItem value="very-positive" className="flex-1">מצוין</ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div>
              <Label className="block mb-2">האם עקבת אחר תוכנית המסחר שלך?</Label>
              <ToggleGroup 
                type="single" 
                className="justify-between"
                value={followedPlan}
                onValueChange={setFollowedPlan}
              >
                <ToggleGroupItem value="completely" className="flex-1">לחלוטין</ToggleGroupItem>
                <ToggleGroupItem value="mostly" className="flex-1">ברובה</ToggleGroupItem>
                <ToggleGroupItem value="partially" className="flex-1">חלקית</ToggleGroupItem>
                <ToggleGroupItem value="rarely" className="flex-1">מעט</ToggleGroupItem>
                <ToggleGroupItem value="not-at-all" className="flex-1">בכלל לא</ToggleGroupItem>
              </ToggleGroup>
            </div>
            
            <div>
              <Label htmlFor="dailyReflection" className="block mb-2">רפלקציה על החלטות המסחר</Label>
              <Textarea
                id="dailyReflection"
                placeholder="כיצד הרגשות השפיעו על החלטות המסחר שלך היום? מה הייתה ההחלטה הטובה ביותר והגרועה ביותר?"
                className="h-32"
                value={dailyReflection}
                onChange={(e) => setDailyReflection(e.target.value)}
              />
            </div>
          </div>
        </div>
        
        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="lessonsLearned" className="block mb-2">תובנות ולקחים מהיום</Label>
            <Textarea
              id="lessonsLearned"
              placeholder="מה למדת על עצמך היום? אילו דפוסים פסיכולוגיים זיהית? איך תשפר את המסחר מחר?"
              className="h-24"
              value={lessonsLearned}
              onChange={(e) => setLessonsLearned(e.target.value)}
            />
          </div>
          
          <Button 
            className="w-full mt-2 bg-primary"
            onClick={() => setConfirmDialogOpen(true)}
          >
            שמור מעקב יומי
          </Button>
        </div>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md rtl" dir="rtl">
            <DialogHeader>
              <DialogTitle>האם לשמור את המעקב היומי?</DialogTitle>
              <DialogDescription>
                לחיצה על 'שמור' תתעד את המעקב הרגשי והפסיכולוגי שלך ליום זה.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <DialogFooter className="sm:justify-between flex-row-reverse">
              <Button type="button" onClick={handleSaveTracking} className="bg-green-600 hover:bg-green-700">
                שמור
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                בטל
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default EnhancedTrackTab;
