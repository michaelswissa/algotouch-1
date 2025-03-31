
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { 
  Dialog,
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Slider
} from "@/components/ui/slider";
import {
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";

interface EmotionSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const EmotionSlider: React.FC<EmotionSliderProps> = ({ value, onChange }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between px-1">
        <div className="flex flex-col items-center">
          <Frown className="h-6 w-6 text-red-500" />
          <span className="text-xs mt-1">מתוח מאוד</span>
        </div>
        <div className="flex flex-col items-center">
          <Meh className="h-6 w-6 text-yellow-500" />
          <span className="text-xs mt-1">ניטרלי</span>
        </div>
        <div className="flex flex-col items-center">
          <Smile className="h-6 w-6 text-green-500" />
          <span className="text-xs mt-1">חד, רגוע ומפוקס</span>
        </div>
      </div>
      <Slider
        value={[value]}
        min={1}
        max={5}
        step={1}
        onValueChange={(newValue) => onChange(newValue[0])}
        className="w-full"
      />
      <div className="flex justify-between px-1">
        <span className="text-sm">1</span>
        <span className="text-sm">2</span>
        <span className="text-sm">3</span>
        <span className="text-sm">4</span>
        <span className="text-sm">5</span>
      </div>
    </div>
  );
};

interface QuestionnaireAnswers {
  morningMood: number;
  interventionUrge: string;
  interventionReasons: string[];
  algorithmTrust: number;
  mentalReadiness: number;
  yesterdayPerformanceCheck: string;
  externalDistraction: string;
  externalDistractionDetails?: string;
  selfDiscipline: number;
  stressPoint: string;
  stressPointDetails?: string;
  selfControl: number;
}

const initialAnswers: QuestionnaireAnswers = {
  morningMood: 3,
  interventionUrge: "",
  interventionReasons: [],
  algorithmTrust: 3,
  mentalReadiness: 3,
  yesterdayPerformanceCheck: "",
  externalDistraction: "",
  externalDistractionDetails: "",
  selfDiscipline: 3,
  stressPoint: "",
  stressPointDetails: "",
  selfControl: 3
};

// Calculate metrics based on questionnaire answers
const calculateMetrics = (answers: QuestionnaireAnswers) => {
  // Convert interventionUrge to numerical value
  const interventionUrgeValue = 
    answers.interventionUrge === "none" ? 0 :
    answers.interventionUrge === "slight" ? 1 :
    answers.interventionUrge === "strong" ? 2 :
    answers.interventionUrge === "intervened" ? 3 : 0;
  
  // Convert yesterdayPerformanceCheck to numerical value
  const yesterdayCheckValue = 
    answers.yesterdayPerformanceCheck === "notChecked" || 
    answers.yesterdayPerformanceCheck === "checkedCalm" ? 0 :
    answers.yesterdayPerformanceCheck === "doubtful" ? 1 :
    answers.yesterdayPerformanceCheck === "wantedToIntervene" ? 2 : 0;
  
  // Convert boolean values to 0/1
  const externalDistractionValue = answers.externalDistraction === "yes" ? 1 : 0;
  const stressPointValue = answers.stressPoint === "yes" ? 1 : 0;
  
  // Emotional Stability Score (ESS)
  const ess = (
    answers.morningMood + 
    answers.algorithmTrust + 
    answers.mentalReadiness + 
    answers.selfDiscipline + 
    answers.selfControl
  ) / 5;
  
  // Intervention Index (II)
  const ii = interventionUrgeValue + yesterdayCheckValue;
  
  // External Stress Factor (ESF)
  const esf = externalDistractionValue;
  
  // Overall Mental Readiness Score (OMRS)
  const omrs = ess - (0.5 * ii) - (0.5 * esf) - (1.0 * stressPointValue);
  
  // Trust Gap (TG)
  const tg = 5 - answers.algorithmTrust;
  
  // Alert Index (AI)
  const ai = (0.6 * ii) + (1.0 * esf) + (1.5 * stressPointValue);
  
  return {
    ess: parseFloat(ess.toFixed(2)),
    ii,
    omrs: parseFloat(omrs.toFixed(2)),
    tg: parseFloat(tg.toFixed(2)),
    ai: parseFloat(ai.toFixed(2))
  };
};

// Generate textual insights based on metrics
const generateInsights = (metrics: ReturnType<typeof calculateMetrics>) => {
  let insight = "";
  
  if (metrics.omrs < 3) {
    insight = "מצבך מעיד על ירידה במוכנות המנטלית. מומלץ לקחת הפסקה ולבחון את גורמי הלחץ.";
  } else if (metrics.ai > 2.5) {
    insight = "נרשמה פעילות רגשית חריגה. יש להיזהר מפני השפעות רגשיות על קבלת ההחלטות.";
  } else if (metrics.tg > 2.5) {
    insight = "זוהה פער אמון משמעותי באלגוריתם. כדאי לשקול בדיקה מחודשת של הסטטיסטיקות והביצועים.";
  } else if (metrics.ii > 3) {
    insight = "נטייה גבוהה להתערבות. מומלץ להגדיר כללים ברורים מתי להתערב ומתי להניח לאלגוריתם לפעול.";
  } else {
    insight = "מצבך יציב והמדדים מעידים על שליטה וביטחון גבוהים. המשך כך!";
  }
  
  return insight;
};

const DailyQuestionnaire: React.FC = () => {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [resultsDialogOpen, setResultsDialogOpen] = useState(false);
  const [metrics, setMetrics] = useState<ReturnType<typeof calculateMetrics> | null>(null);
  const [insight, setInsight] = useState<string>("");
  const { toast } = useToast();

  // Handle changes to emotion slider
  const handleMoodChange = (value: number) => {
    setAnswers(prev => ({ ...prev, morningMood: value }));
  };

  // Handle changes to algorithm trust slider
  const handleAlgorithmTrustChange = (value: number) => {
    setAnswers(prev => ({ ...prev, algorithmTrust: value }));
  };

  // Handle changes to mental readiness slider
  const handleMentalReadinessChange = (value: number) => {
    setAnswers(prev => ({ ...prev, mentalReadiness: value }));
  };

  // Handle changes to self discipline slider
  const handleSelfDisciplineChange = (value: number) => {
    setAnswers(prev => ({ ...prev, selfDiscipline: value }));
  };

  // Handle changes to self control slider
  const handleSelfControlChange = (value: number) => {
    setAnswers(prev => ({ ...prev, selfControl: value }));
  };

  // Handle changes to radio buttons
  const handleRadioChange = (name: keyof QuestionnaireAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes to text inputs
  const handleTextChange = (name: keyof QuestionnaireAnswers, value: string) => {
    setAnswers(prev => ({ ...prev, [name]: value }));
  };

  // Handle changes to checkbox group (intervention reasons)
  const handleReasonChange = (reason: string, checked: boolean) => {
    setAnswers(prev => {
      const updatedReasons = checked 
        ? [...prev.interventionReasons, reason]
        : prev.interventionReasons.filter(r => r !== reason);
      
      return { ...prev, interventionReasons: updatedReasons };
    });
  };

  // Handle questionnaire submission
  const handleSubmit = () => {
    setConfirmDialogOpen(false);
    
    // Calculate metrics
    const calculatedMetrics = calculateMetrics(answers);
    setMetrics(calculatedMetrics);
    
    // Generate insights
    const generatedInsight = generateInsights(calculatedMetrics);
    setInsight(generatedInsight);
    
    // Show results dialog
    setResultsDialogOpen(true);
    
    // Show toast notification
    toast({
      title: "השאלון הושלם בהצלחה",
      description: "התשובות נשמרו ונותחו",
      duration: 3000,
    });
  };

  return (
    <Card className="hover-glow rtl">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">שאלון יומי</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Morning Mood */}
        <div className="space-y-2">
          <Label className="text-base">1. איך אתה מרגיש הבוקר?</Label>
          <EmotionSlider 
            value={answers.morningMood}
            onChange={handleMoodChange}
          />
        </div>

        {/* Intervention Urge */}
        <div className="space-y-2">
          <Label className="text-base">2. האם הרגשת דחף להתערב באלגו היום?</Label>
          <RadioGroup
            value={answers.interventionUrge}
            onValueChange={(value) => handleRadioChange("interventionUrge", value)}
            className="flex flex-col space-y-1 mt-2"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="none" id="urge-none" />
              <Label htmlFor="urge-none" className="font-normal">לא בכלל</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="slight" id="urge-slight" />
              <Label htmlFor="urge-slight" className="font-normal">רצון קל</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="strong" id="urge-strong" />
              <Label htmlFor="urge-strong" className="font-normal">רצון חזק</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="intervened" id="urge-intervened" />
              <Label htmlFor="urge-intervened" className="font-normal">התערבתי בפועל</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Intervention Reasons (conditional) */}
        {answers.interventionUrge === "intervened" && (
          <div className="space-y-2 border-r-2 border-primary/30 pr-4 py-2">
            <Label className="text-base">מה גרם לך להתערב?</Label>
            <div className="flex flex-col space-y-2 mt-2">
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="reason-fear" 
                  checked={answers.interventionReasons.includes("fear")}
                  onCheckedChange={(checked) => handleReasonChange("fear", checked as boolean)}
                />
                <Label htmlFor="reason-fear" className="font-normal">פחד מהפסד</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="reason-fix" 
                  checked={answers.interventionReasons.includes("fix")}
                  onCheckedChange={(checked) => handleReasonChange("fix", checked as boolean)}
                />
                <Label htmlFor="reason-fix" className="font-normal">רצון לתקן</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="reason-distrust" 
                  checked={answers.interventionReasons.includes("distrust")}
                  onCheckedChange={(checked) => handleReasonChange("distrust", checked as boolean)}
                />
                <Label htmlFor="reason-distrust" className="font-normal">חוסר אמון באלגו</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="reason-greed" 
                  checked={answers.interventionReasons.includes("greed")}
                  onCheckedChange={(checked) => handleReasonChange("greed", checked as boolean)}
                />
                <Label htmlFor="reason-greed" className="font-normal">חמדנות / פומו</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox 
                  id="reason-other" 
                  checked={answers.interventionReasons.includes("other")}
                  onCheckedChange={(checked) => handleReasonChange("other", checked as boolean)}
                />
                <Label htmlFor="reason-other" className="font-normal">סיבה אחרת</Label>
              </div>
            </div>
          </div>
        )}

        {/* Algorithm Trust */}
        <div className="space-y-2">
          <Label className="text-base">3. כמה אתה סומך היום על האלגו?</Label>
          <div className="px-1">
            <Slider
              value={[answers.algorithmTrust]}
              min={1}
              max={5}
              step={1}
              onValueChange={(newValue) => handleAlgorithmTrustChange(newValue[0])}
              className="w-full my-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>אין אמון</span>
              <span>נייטרלי</span>
              <span>סומך לגמרי</span>
            </div>
          </div>
        </div>

        {/* Mental Readiness */}
        <div className="space-y-2">
          <Label className="text-base">4. איך אתה מרגיש פיזית ונפשית למסחר היום?</Label>
          <div className="px-1">
            <Slider
              value={[answers.mentalReadiness]}
              min={1}
              max={5}
              step={1}
              onValueChange={(newValue) => handleMentalReadinessChange(newValue[0])}
              className="w-full my-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>עייף, מוסח, לא חד</span>
              <span></span>
              <span>חד כמו תער, מלא אנרגיה</span>
            </div>
          </div>
        </div>

        {/* Yesterday's Check */}
        <div className="space-y-2">
          <Label className="text-base">5. בדקת את ביצועי האלגו אתמול?</Label>
          <RadioGroup
            value={answers.yesterdayPerformanceCheck}
            onValueChange={(value) => handleRadioChange("yesterdayPerformanceCheck", value)}
            className="flex flex-col space-y-1 mt-2"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="notChecked" id="check-none" />
              <Label htmlFor="check-none" className="font-normal">לא בדקתי</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="checkedCalm" id="check-calm" />
              <Label htmlFor="check-calm" className="font-normal">בדקתי והרגשתי רגוע</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="doubtful" id="check-doubt" />
              <Label htmlFor="check-doubt" className="font-normal">זה הכניס לי ספק</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="wantedToIntervene" id="check-wanted" />
              <Label htmlFor="check-wanted" className="font-normal">זה גרם לי לרצות להתערב</Label>
            </div>
          </RadioGroup>
        </div>

        {/* External Distraction */}
        <div className="space-y-2">
          <Label className="text-base">6. יש משהו חיצוני שמטריד אותך היום?</Label>
          <RadioGroup
            value={answers.externalDistraction}
            onValueChange={(value) => handleRadioChange("externalDistraction", value)}
            className="flex gap-4 mt-2"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="no" id="distraction-no" />
              <Label htmlFor="distraction-no" className="font-normal">לא</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="yes" id="distraction-yes" />
              <Label htmlFor="distraction-yes" className="font-normal">כן</Label>
            </div>
          </RadioGroup>
          
          {answers.externalDistraction === "yes" && (
            <div className="mt-2">
              <Textarea 
                placeholder="פרט..."
                value={answers.externalDistractionDetails}
                onChange={(e) => handleTextChange("externalDistractionDetails", e.target.value)}
                className="h-20"
              />
            </div>
          )}
        </div>

        {/* Self Discipline */}
        <div className="space-y-2">
          <Label className="text-base">7. עד כמה שמרת על משמעת היום?</Label>
          <div className="px-1">
            <Slider
              value={[answers.selfDiscipline]}
              min={1}
              max={5}
              step={1}
              onValueChange={(newValue) => handleSelfDisciplineChange(newValue[0])}
              className="w-full my-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>פעלתי מהבטן</span>
              <span></span>
              <span>נשארתי עם הידיים מאחורי הגב</span>
            </div>
          </div>
        </div>

        {/* Stress Point */}
        <div className="space-y-2">
          <Label className="text-base">8. בסוף היום: האם הייתה נקודה של חרטה / סטרס / פחד?</Label>
          <RadioGroup
            value={answers.stressPoint}
            onValueChange={(value) => handleRadioChange("stressPoint", value)}
            className="flex gap-4 mt-2"
          >
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="no" id="stress-no" />
              <Label htmlFor="stress-no" className="font-normal">לא</Label>
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <RadioGroupItem value="yes" id="stress-yes" />
              <Label htmlFor="stress-yes" className="font-normal">כן</Label>
            </div>
          </RadioGroup>
          
          {answers.stressPoint === "yes" && (
            <div className="mt-2">
              <Textarea 
                placeholder="מה גרם לזה?"
                value={answers.stressPointDetails}
                onChange={(e) => handleTextChange("stressPointDetails", e.target.value)}
                className="h-20"
              />
            </div>
          )}
        </div>

        {/* Self Control */}
        <div className="space-y-2">
          <Label className="text-base">9. איך היית מדרג את תחושת השליטה העצמית שלך היום?</Label>
          <div className="px-1">
            <Slider
              value={[answers.selfControl]}
              min={1}
              max={5}
              step={1}
              onValueChange={(newValue) => handleSelfControlChange(newValue[0])}
              className="w-full my-4"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <Button 
          onClick={() => setConfirmDialogOpen(true)} 
          className="w-full mt-6"
        >
          שלח שאלון
        </Button>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md rtl">
            <DialogHeader>
              <DialogTitle>האם לשלוח את השאלון?</DialogTitle>
              <DialogDescription>
                לחיצה על 'שלח' תשמור את התשובות ותנתח את הנתונים.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
            <DialogFooter className="sm:justify-between flex-row-reverse">
              <Button type="button" onClick={handleSubmit} className="bg-green-600 hover:bg-green-700">
                שלח
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmDialogOpen(false)}>
                בטל
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Results Dialog */}
        <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen}>
          <DialogContent className="sm:max-w-md rtl">
            <DialogHeader>
              <DialogTitle>ניתוח השאלון</DialogTitle>
              <DialogDescription>
                המוח שלך מול המכונה - תובנות רגשיות
              </DialogDescription>
            </DialogHeader>
            
            {metrics && (
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">יציבות רגשית (ESS):</span>
                    <span className="text-sm font-medium">{metrics.ess}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">מדד התערבות (II):</span>
                    <span className="text-sm font-medium">{metrics.ii}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">מוכנות מנטלית (OMRS):</span>
                    <span className="text-sm font-medium">{metrics.omrs}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">פער אמון (TG):</span>
                    <span className="text-sm font-medium">{metrics.tg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">מדד אזעקה (AI):</span>
                    <span className="text-sm font-medium">{metrics.ai}</span>
                  </div>
                </div>

                <div className={`p-4 rounded-md ${
                  metrics.ai > 2.5 ? "bg-red-100 dark:bg-red-900/20" :
                  metrics.omrs < 3 ? "bg-yellow-100 dark:bg-yellow-900/20" :
                  "bg-green-100 dark:bg-green-900/20"
                }`}>
                  <div className="flex gap-2">
                    {metrics.ai > 2.5 ? (
                      <AlertTriangle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    ) : metrics.omrs < 3 ? (
                      <Info className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm">{insight}</p>
                  </div>
                </div>
              </div>
            )}
            
            <DialogFooter>
              <Button type="button" onClick={() => setResultsDialogOpen(false)}>
                סגור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default DailyQuestionnaire;
