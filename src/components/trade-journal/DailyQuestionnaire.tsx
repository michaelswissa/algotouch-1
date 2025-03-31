
import React, { useState } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';

import RatingButtons from './RatingButtons';
import EmotionIcon from './EmotionIcon';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Frown, Meh, Smile, ThumbsUp, AlertCircle } from 'lucide-react';

// Define form schema
const formSchema = z.object({
  feelingRating: z.string(),
  feelingNotes: z.string().optional(),
  interventionLevel: z.enum(['none', 'slight', 'strong', 'actual']),
  interventionReasons: z.array(z.string()).optional(),
  marketDirection: z.enum(['up', 'sideways', 'down']),
  mentalState: z.string(),
  mentalStateNotes: z.string().optional(),
  algoPerformanceChecked: z.enum(['yes', 'no']),
  algoPerformanceNotes: z.string().optional(),
  riskPercentage: z.string(),
  riskComfortLevel: z.string(),
  dailyReflection: z.string().optional(),
}).refine(
  (data) => {
    // If algoPerformanceChecked is 'yes', then algoPerformanceNotes should not be empty
    if (data.algoPerformanceChecked === 'yes') {
      return !!data.algoPerformanceNotes;
    }
    return true;
  },
  {
    message: "אנא הזן את המסקנות העיקריות",
    path: ["algoPerformanceNotes"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface DailyQuestionnaireProps {
  onSubmit: (data: any) => void;
}

const DailyQuestionnaire: React.FC<DailyQuestionnaireProps> = ({ onSubmit }) => {
  const [showInterventionReasons, setShowInterventionReasons] = useState(false);
  const [showAlgoNotes, setShowAlgoNotes] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      feelingRating: '3',
      feelingNotes: '',
      interventionLevel: 'none',
      interventionReasons: [],
      marketDirection: 'sideways',
      mentalState: '3',
      mentalStateNotes: '',
      algoPerformanceChecked: 'no',
      algoPerformanceNotes: '',
      riskPercentage: '0.5',
      riskComfortLevel: '3',
      dailyReflection: '',
    }
  });

  const interventionLevel = watch('interventionLevel');
  const algoPerformanceChecked = watch('algoPerformanceChecked');
  const riskPercentage = watch('riskPercentage');
  const feelingRating = watch('feelingRating');

  React.useEffect(() => {
    setShowInterventionReasons(interventionLevel === 'actual');
  }, [interventionLevel]);

  React.useEffect(() => {
    setShowAlgoNotes(algoPerformanceChecked === 'yes');
  }, [algoPerformanceChecked]);

  const emotionOptions = [
    { value: '1', label: 'מתוח מאוד', tooltip: 'מתוח, חושש וחסר בטחון', icon: <EmotionIcon emotion="1" animated /> },
    { value: '2', label: 'מתוח', tooltip: 'מעט מתוח או לחוץ', icon: <EmotionIcon emotion="2" animated /> },
    { value: '3', label: 'ניטרלי', tooltip: 'תחושה ניטרלית, לא רגוע ולא מתוח', icon: <EmotionIcon emotion="3" animated /> },
    { value: '4', label: 'רגוע', tooltip: 'רגוע ובטוח', icon: <EmotionIcon emotion="4" animated /> },
    { value: '5', label: 'רגוע מאוד', tooltip: 'רגוע מאוד ומפוקס', icon: <EmotionIcon emotion="5" animated /> },
  ];

  const interventionReasons = [
    { id: 'fear', label: 'פחד מהפסד', icon: <EmotionIcon emotion="fear" size={16} /> },
    { id: 'fix', label: 'רצון לתקן', icon: <EmotionIcon emotion="fix" size={16} /> },
    { id: 'distrust', label: 'חוסר אמון באלגו', icon: <EmotionIcon emotion="distrust" size={16} /> },
    { id: 'greed', label: 'חמדנות / פומו', icon: <EmotionIcon emotion="greed" size={16} /> },
  ];

  const onFormSubmit = (data: FormValues) => {
    // Format the data as required for the report
    const formattedData = {
      date: format(new Date(), 'dd/MM/yyyy'),
      feeling: {
        rating: parseInt(data.feelingRating),
        notes: data.feelingNotes
      },
      intervention: {
        level: data.interventionLevel,
        reasons: data.interventionReasons || []
      },
      marketDirection: data.marketDirection,
      mentalState: {
        rating: parseInt(data.mentalState),
        notes: data.mentalStateNotes
      },
      algoPerformance: {
        checked: data.algoPerformanceChecked,
        notes: data.algoPerformanceNotes
      },
      riskManagement: {
        percentage: parseFloat(data.riskPercentage),
        comfortLevel: parseInt(data.riskComfortLevel)
      },
      reflection: data.dailyReflection
    };
    
    console.log('Form values:', data);
    console.log('Form data:', formattedData);
    
    onSubmit(formattedData);
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)}>
      <Card className="w-full shadow-md hover-glow">
        <CardHeader>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            סיכום יומי
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* איך אתה מרגיש */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">איך אתה מרגיש?</h3>
              <EmotionIcon emotion={feelingRating} size={28} />
            </div>
            
            <RatingButtons
              value={feelingRating}
              onChange={(value) => setValue('feelingRating', value)}
              options={emotionOptions}
              showNotesForValues={['1', '2']}
              notesValue={watch('feelingNotes')}
              onNotesChange={(notes) => setValue('feelingNotes', notes)}
              notesPlaceholder="תאר את התחושות שלך בצורה מפורטת..."
              notesTitle="תאר את ההרגשה שלך"
              notesDescription="פרט מה משפיע על ההרגשה שלך היום"
            />
            
            {watch('feelingNotes') && (
              <div className="bg-card/40 p-3 rounded-md border border-border/30 text-sm">
                {watch('feelingNotes')}
              </div>
            )}
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* התערבות במסחר */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">התערבות במסחר</h3>
            <p className="text-sm text-muted-foreground">האם הרגשת דחף להתערב באלגו היום?</p>
            
            <RadioGroup
              value={interventionLevel}
              onValueChange={(value) => setValue('interventionLevel', value as 'none' | 'slight' | 'strong' | 'actual')}
              className="flex flex-wrap gap-3 justify-between"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="none" id="none" />
                <Label htmlFor="none" className="font-medium">לא בכלל</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="slight" id="slight" />
                <Label htmlFor="slight" className="font-medium">רצון קל</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="strong" id="strong" />
                <Label htmlFor="strong" className="font-medium">רצון חזק</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="actual" id="actual" />
                <Label htmlFor="actual" className="font-medium">התערבתי בפועל</Label>
              </div>
            </RadioGroup>
            
            {showInterventionReasons && (
              <div className="bg-card/30 p-4 rounded-md border border-border/30 mt-3 animate-fade-in">
                <h4 className="text-md font-medium mb-3">מה גרם לך להתערב?</h4>
                <div className="grid grid-cols-2 gap-3">
                  {interventionReasons.map((reason) => (
                    <div key={reason.id} className="flex items-center space-x-2 space-x-reverse">
                      <Checkbox
                        id={reason.id}
                        checked={watch('interventionReasons')?.includes(reason.id)}
                        onCheckedChange={(checked) => {
                          const currentReasons = watch('interventionReasons') || [];
                          if (checked) {
                            setValue('interventionReasons', [...currentReasons, reason.id]);
                          } else {
                            setValue('interventionReasons', currentReasons.filter(r => r !== reason.id));
                          }
                        }}
                      />
                      <label
                        htmlFor={reason.id}
                        className="text-sm font-medium flex items-center cursor-pointer"
                      >
                        <span className="mr-1">{reason.icon}</span>
                        {reason.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* כיוון השוק */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">כיוון השוק</h3>
            <p className="text-sm text-muted-foreground">מה כיוון השוק היום?</p>
            
            <RadioGroup
              value={watch('marketDirection')}
              onValueChange={(value) => setValue('marketDirection', value as 'up' | 'sideways' | 'down')}
              className="flex justify-between"
            >
              <div className="flex flex-col items-center space-y-1">
                <div className="h-12 w-8 bg-green-500/30 rounded-t"></div>
                <RadioGroupItem value="up" id="up" className="mt-2" />
                <Label htmlFor="up" className="font-medium text-green-500">עולה</Label>
              </div>
              
              <div className="flex flex-col items-center space-y-1">
                <div className="h-8 w-8 bg-yellow-500/30 rounded-t"></div>
                <RadioGroupItem value="sideways" id="sideways" className="mt-2" />
                <Label htmlFor="sideways" className="font-medium text-yellow-500">מדשדש</Label>
              </div>
              
              <div className="flex flex-col items-center space-y-1">
                <div className="h-12 w-8 bg-red-500/30 rounded-t"></div>
                <RadioGroupItem value="down" id="down" className="mt-2" />
                <Label htmlFor="down" className="font-medium text-red-500">יורד</Label>
              </div>
            </RadioGroup>
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* מצב נפשי ומנטלי למסחר */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">מצב נפשי ומנטלי למסחר</h3>
              <EmotionIcon emotion={watch('mentalState')} size={28} />
            </div>
            
            <p className="text-sm text-muted-foreground">איך אתה מרגיש מנטלית בנוגע למסחר היום?</p>
            
            <RatingButtons
              value={watch('mentalState')}
              onChange={(value) => setValue('mentalState', value)}
              options={[
                { value: '1', label: 'השוק תנודתי, אני חושש', tooltip: 'תחושה של חשש וחוסר ודאות', icon: <Frown size={18} className="text-red-500" /> },
                { value: '2', label: 'מעט לא בטוח', tooltip: 'חוסר בטחון קל', icon: <AlertCircle size={18} className="text-orange-500" /> },
                { value: '3', label: 'ניטרלי', tooltip: 'תחושה ניטרלית כלפי השוק', icon: <Meh size={18} className="text-yellow-500" /> },
                { value: '4', label: 'די בטוח', tooltip: 'תחושה של בטחון בכיוון השוק', icon: <Smile size={18} className="text-blue-500" /> },
                { value: '5', label: 'השוק נראה יציב, אני בטוח', tooltip: 'בטחון מלא בכיוון השוק', icon: <ThumbsUp size={18} className="text-green-500" /> },
              ]}
            />
            
            <div>
              <Textarea
                placeholder="הוסף הערות על איך ההרגשה המנטלית משפיעה על קבלת ההחלטות שלך..."
                value={watch('mentalStateNotes')}
                onChange={(e) => setValue('mentalStateNotes', e.target.value)}
                className="resize-none h-24"
              />
            </div>
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* בדיקת ביצועי האלגו */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">בדיקת ביצועי האלגו</h3>
            <p className="text-sm text-muted-foreground">בדקת את ביצועי האלגו בשבוע האחרון?</p>
            
            <RadioGroup
              value={watch('algoPerformanceChecked')}
              onValueChange={(value) => setValue('algoPerformanceChecked', value as 'yes' | 'no')}
              className="flex justify-between max-w-md mx-auto"
            >
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="yes" id="checked-yes" />
                <Label htmlFor="checked-yes" className="font-medium">בדקתי</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="no" id="checked-no" />
                <Label htmlFor="checked-no" className="font-medium">לא בדקתי</Label>
              </div>
            </RadioGroup>
            
            {showAlgoNotes && (
              <div className="animate-fade-in">
                <Textarea
                  placeholder="מהם המסקנות העיקריות או השיפורים שזיהית?"
                  value={watch('algoPerformanceNotes')}
                  onChange={(e) => setValue('algoPerformanceNotes', e.target.value)}
                  className="resize-none h-24"
                />
                {errors.algoPerformanceNotes && (
                  <p className="text-red-500 text-sm mt-1">{errors.algoPerformanceNotes.message}</p>
                )}
              </div>
            )}
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* שיפור ביצועים */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">שיפור ביצועים</h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-sm font-medium">כמה אחוז אתה מסכן לכל עסקה?</label>
                  <span className="text-sm font-semibold bg-primary/20 px-2 py-0.5 rounded">{riskPercentage}%</span>
                </div>
                <Slider
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={[parseFloat(riskPercentage)]}
                  onValueChange={(value) => setValue('riskPercentage', value[0].toString())}
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">מה מידת הנוחות שלך עם ההפסדים האפשריים ברמת הסיכון הנוכחית?</label>
                <RatingButtons
                  value={watch('riskComfortLevel')}
                  onChange={(value) => setValue('riskComfortLevel', value)}
                  options={[
                    { value: '1', label: 'לא נוח בכלל', tooltip: 'הפסדים גורמים לי לחרדה משמעותית', icon: <Frown size={18} className="text-red-500" /> },
                    { value: '2', label: 'לא נוח', tooltip: 'הפסדים גורמים לי לאי נוחות', icon: <AlertCircle size={18} className="text-orange-500" /> },
                    { value: '3', label: 'ניטרלי', tooltip: 'הפסדים לא מטרידים אותי יותר מדי', icon: <Meh size={18} className="text-yellow-500" /> },
                    { value: '4', label: 'נוח', tooltip: 'אני מרגיש בנוח יחסית עם הפסדים', icon: <Smile size={18} className="text-blue-500" /> },
                    { value: '5', label: 'נוח לגמרי', tooltip: 'הפסדים הם חלק מהמשחק ואני מקבל אותם בקלות', icon: <ThumbsUp size={18} className="text-green-500" /> },
                  ]}
                />
              </div>
            </div>
          </div>
          
          <Separator className="bg-border/30" />
          
          {/* תיעוד רפלקציה יומית */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">תיעוד רפלקציה יומית ותובנות</h3>
            
            <Alert className="bg-primary/10 border-primary/30">
              <Info className="h-4 w-4 text-primary" />
              <AlertDescription>
                רפלקציה יומית היא כלי חשוב לשיפור מתמיד. תיעוד מדויק של רגשות, מחשבות והחלטות יאפשר לך לזהות דפוסים ולשפר את הביצועים לאורך זמן.
              </AlertDescription>
            </Alert>
            
            <div>
              <label className="text-sm font-medium block mb-2">
                מה למדת היום? רשום כאן תובנות, נקודות לשיפור או דברים שתרצה לשמר להמשך.
              </label>
              <Textarea
                placeholder="הוסף את התובנות וההערות שלך כאן..."
                value={watch('dailyReflection')}
                onChange={(e) => setValue('dailyReflection', e.target.value)}
                className="resize-none h-36"
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="justify-end space-x-reverse space-x-2 pt-4">
          <Button type="submit" className="gap-2 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105">
            שלח את הסיכום היומי
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

export default DailyQuestionnaire;
