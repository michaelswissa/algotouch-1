
import React, { useState } from 'react';
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
  Slider,
  SliderTrack,
  SliderValue
} from "@/components/ui/slider";
import {
  CheckCircle2,
  Smile,
  Meh,
  Frown,
  AlertTriangle,
  Info,
  HelpCircle,
  PieChart,
  BarChart
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "framer-motion";
import { QuestionnaireResults } from './QuestionnaireResults';

// Component to display emoji slider with tooltips
const EmotionSlider: React.FC<{
  value: number;
  onChange: (value: number) => void;
  labels: Record<number, string>;
  tooltips: Record<number, string>;
}> = ({ value, onChange, labels, tooltips }) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between px-1">
        <div className="flex flex-col items-center">
          <Frown className="h-6 w-6 text-red-500" />
          <span className="text-xs mt-1 text-muted-foreground">{labels[1]}</span>
        </div>
        <div className="flex flex-col items-center">
          <Meh className="h-6 w-6 text-amber-500" />
          <span className="text-xs mt-1 text-muted-foreground">{labels[3]}</span>
        </div>
        <div className="flex flex-col items-center">
          <Smile className="h-6 w-6 text-green-500" />
          <span className="text-xs mt-1 text-muted-foreground">{labels[5]}</span>
        </div>
      </div>
      
      <div className="relative px-3">
        <Slider
          value={[value]}
          min={1}
          max={5}
          step={1}
          onValueChange={(newValue) => onChange(newValue[0])}
          className="w-full"
        />
        
        <div className="flex justify-between px-1 mt-1">
          {[1, 2, 3, 4, 5].map(n => (
            <TooltipProvider key={n} delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className={`h-6 w-6 rounded-full flex items-center justify-center cursor-pointer transition-colors ${
                      value === n ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    }`}
                    onClick={() => onChange(n)}
                  >
                    <span className="text-xs font-medium">{n}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="bg-card" dir="rtl">
                  <p>{tooltips[n]}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ))}
        </div>
      </div>
    </div>
  );
};

// Types for our questionnaire answers
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

// Initial state for the form
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
const generateInsight = (metrics: ReturnType<typeof calculateMetrics>) => {
  let insight = "";
  
  if (metrics.omrs < 3) {
    insight = "המצב מעיד על ירידה במוכנות המנטלית. מומלץ לקחת הפסקה ולבחון את גורמי הלחץ.";
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

  // Mood slider config
  const moodLabels = {
    1: "מתוח מאוד",
    3: "ניטרלי",
    5: "חד, רגוע ומפוקס"
  };
  
  const moodTooltips = {
    1: "מתוח מאוד: חרדה גבוהה, קושי להתרכז",
    2: "מתוח: רמת מתח בינונית-גבוהה",
    3: "ניטרלי: לא רגוע ולא מתוח במיוחד",
    4: "רגוע: מצב רוח טוב, יכולת ריכוז סבירה",
    5: "חד ומפוקס: ריכוז מקסימלי, רוגע ובהירות מחשבתית"
  };

  // Algorithm trust slider config
  const trustLabels = {
    1: "אין אמון",
    3: "נייטרלי",
    5: "סומך לגמרי"
  };
  
  const trustTooltips = {
    1: "חוסר אמון מוחלט באלגוריתם",
    2: "אמון נמוך, ספקות משמעותיים",
    3: "אמון בינוני, ניטרלי",
    4: "אמון גבוה, מעט ספקות",
    5: "אמון מלא באלגוריתם ללא ספקות"
  };

  // Mental readiness slider config
  const readinessLabels = {
    1: "עייף, מוסח",
    3: "בינוני",
    5: "חד כמו תער"
  };
  
  const readinessTooltips = {
    1: "עייפות קיצונית, קושי להתרכז",
    2: "עייפות קלה, ריכוז לסירוגין",
    3: "מצב ממוצע, לא עייף ולא ערני במיוחד",
    4: "ערני, מרוכז ברוב הזמן",
    5: "ערנות ופוקוס מקסימליים, אנרגיה גבוהה"
  };

  // Self discipline slider config
  const disciplineLabels = {
    1: "פעלתי מהבטן",
    3: "בינוני",
    5: "ידיים מאחורי הגב"
  };
  
  const disciplineTooltips = {
    1: "פעלתי באימפולסיביות, ללא משמעת עצמית",
    2: "משמעת עצמית נמוכה, פעולות מהירות",
    3: "משמעת עצמית בינונית",
    4: "משמעת עצמית גבוהה, התאפקות טובה",
    5: "משמעת עצמית מושלמת, ללא התערבויות"
  };

  // Self control slider config
  const controlLabels = {
    1: "חסר שליטה",
    3: "בינוני",
    5: "שליטה מלאה"
  };
  
  const controlTooltips = {
    1: "חוסר שליטה עצמית, התנהגות אימפולסיבית",
    2: "שליטה עצמית נמוכה, קושי בויסות רגשי",
    3: "שליטה עצמית בינונית",
    4: "שליטה עצמית טובה, ויסות רגשי יעיל",
    5: "שליטה עצמית מלאה, ויסות רגשי מצוין"
  };

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
    const generatedInsight = generateInsight(calculatedMetrics);
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
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="hover-glow rtl shadow-md">
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: 0 }}
            >
              <PieChart className="h-5 w-5 text-primary" />
            </motion.div>
            שאלון יומי
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Morning Mood */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">1. איך אתה מרגיש הבוקר?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>דרג את מצב הרוח והתחושה הכללית שלך הבוקר, כאשר 1 מסמל "מתוח מאוד" ו-5 מסמל "חד, רגוע ומפוקס".</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <EmotionSlider 
              value={answers.morningMood}
              onChange={handleMoodChange}
              labels={moodLabels}
              tooltips={moodTooltips}
            />
          </div>

          {/* Intervention Urge */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">2. האם הרגשת דחף להתערב באלגו היום?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>עד כמה הרגשת צורך להתערב בפעילות האלגוריתם במהלך המסחר.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={answers.interventionUrge}
              onValueChange={(value) => handleRadioChange("interventionUrge", value)}
              className="grid grid-cols-2 gap-2 mt-2"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "none" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="none" id="urge-none" />
                  <Label htmlFor="urge-none" className="font-medium cursor-pointer w-full">לא בכלל</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "slight" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="slight" id="urge-slight" />
                  <Label htmlFor="urge-slight" className="font-medium cursor-pointer w-full">רצון קל</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "strong" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="strong" id="urge-strong" />
                  <Label htmlFor="urge-strong" className="font-medium cursor-pointer w-full">רצון חזק</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "intervened" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="intervened" id="urge-intervened" />
                  <Label htmlFor="urge-intervened" className="font-medium cursor-pointer w-full">התערבתי בפועל</Label>
                </div>
              </motion.div>
            </RadioGroup>
          </div>

          {/* Intervention Reasons (conditional) */}
          {answers.interventionUrge === "intervened" && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2 border-r-2 border-primary/30 pr-4 py-2 bg-primary/5 rounded-md"
            >
              <Label className="text-base font-medium">מה גרם לך להתערב?</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="reason-fear" 
                    checked={answers.interventionReasons.includes("fear")}
                    onCheckedChange={(checked) => handleReasonChange("fear", checked as boolean)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="reason-fear" className="font-medium cursor-pointer">פחד מהפסד</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="reason-fix" 
                    checked={answers.interventionReasons.includes("fix")}
                    onCheckedChange={(checked) => handleReasonChange("fix", checked as boolean)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="reason-fix" className="font-medium cursor-pointer">רצון לתקן</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="reason-distrust" 
                    checked={answers.interventionReasons.includes("distrust")}
                    onCheckedChange={(checked) => handleReasonChange("distrust", checked as boolean)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="reason-distrust" className="font-medium cursor-pointer">חוסר אמון באלגו</Label>
                </div>
                <div className="flex items-center space-x-2 space-x-reverse">
                  <Checkbox 
                    id="reason-greed" 
                    checked={answers.interventionReasons.includes("greed")}
                    onCheckedChange={(checked) => handleReasonChange("greed", checked as boolean)}
                    className="data-[state=checked]:bg-primary"
                  />
                  <Label htmlFor="reason-greed" className="font-medium cursor-pointer">חמדנות / פומו</Label>
                </div>
              </div>
            </motion.div>
          )}

          {/* Algorithm Trust */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">3. כמה אתה סומך היום על האלגו?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>דרג את רמת האמון שלך באלגוריתם ובהחלטות שהוא מקבל.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="px-1">
              <EmotionSlider 
                value={answers.algorithmTrust}
                onChange={handleAlgorithmTrustChange}
                labels={trustLabels}
                tooltips={trustTooltips}
              />
            </div>
          </div>

          {/* Mental Readiness */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">4. איך אתה מרגיש פיזית ונפשית למסחר היום?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>דרג את הכושר הפיזי והנפשי שלך היום למסחר.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="px-1">
              <EmotionSlider 
                value={answers.mentalReadiness}
                onChange={handleMentalReadinessChange}
                labels={readinessLabels}
                tooltips={readinessTooltips}
              />
            </div>
          </div>

          {/* Yesterday's Check */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">5. בדקת את ביצועי האלגו אתמול?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>האם בדקת את ביצועי האלגוריתם מהיום הקודם, ואם כן - איך הגבת?</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={answers.yesterdayPerformanceCheck}
              onValueChange={(value) => handleRadioChange("yesterdayPerformanceCheck", value)}
              className="grid grid-cols-2 gap-2 mt-2"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "notChecked" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="notChecked" id="check-none" />
                  <Label htmlFor="check-none" className="font-medium cursor-pointer w-full">לא בדקתי</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "checkedCalm" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="checkedCalm" id="check-calm" />
                  <Label htmlFor="check-calm" className="font-medium cursor-pointer w-full">בדקתי והרגשתי רגוע</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "doubtful" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="doubtful" id="check-doubt" />
                  <Label htmlFor="check-doubt" className="font-medium cursor-pointer w-full">זה הכניס לי ספק</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "wantedToIntervene" ? "border-primary bg-primary/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="wantedToIntervene" id="check-wanted" />
                  <Label htmlFor="check-wanted" className="font-medium cursor-pointer w-full">גרם לי לרצות להתערב</Label>
                </div>
              </motion.div>
            </RadioGroup>
          </div>

          {/* External Distraction */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">6. יש משהו חיצוני שמטריד אותך היום?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>האם יש גורמים חיצוניים כמו דאגות, אירועים אישיים או חדשות שמטרידים אותך?</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={answers.externalDistraction}
              onValueChange={(value) => handleRadioChange("externalDistraction", value)}
              className="flex gap-4 mt-2"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.externalDistraction === "no" ? "border-green-500 bg-green-500/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="no" id="distraction-no" />
                  <Label htmlFor="distraction-no" className="font-medium cursor-pointer">לא</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.externalDistraction === "yes" ? "border-amber-500 bg-amber-500/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="yes" id="distraction-yes" />
                  <Label htmlFor="distraction-yes" className="font-medium cursor-pointer">כן</Label>
                </div>
              </motion.div>
            </RadioGroup>
            
            {answers.externalDistraction === "yes" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <Textarea 
                  placeholder="פרט את הגורמים החיצוניים המטרידים אותך..."
                  value={answers.externalDistractionDetails}
                  onChange={(e) => handleTextChange("externalDistractionDetails", e.target.value)}
                  className="h-20 resize-none focus:ring-2 focus:ring-primary"
                />
              </motion.div>
            )}
          </div>

          {/* Self Discipline */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">7. עד כמה שמרת על משמעת היום?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>כמה הצלחת להיצמד לכללים ולתוכנית המסחר שלך.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="px-1">
              <EmotionSlider 
                value={answers.selfDiscipline}
                onChange={handleSelfDisciplineChange}
                labels={disciplineLabels}
                tooltips={disciplineTooltips}
              />
            </div>
          </div>

          {/* Stress Point */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">8. בסוף היום: האם הייתה נקודה של חרטה / סטרס / פחד?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>האם היו רגעים במהלך היום שגרמו לך לחרטה או לחץ משמעותי?</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <RadioGroup
              value={answers.stressPoint}
              onValueChange={(value) => handleRadioChange("stressPoint", value)}
              className="flex gap-4 mt-2"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.stressPoint === "no" ? "border-green-500 bg-green-500/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="no" id="stress-no" />
                  <Label htmlFor="stress-no" className="font-medium cursor-pointer">לא</Label>
                </div>
              </motion.div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.stressPoint === "yes" ? "border-amber-500 bg-amber-500/10" : "border-muted bg-card"}`}>
                  <RadioGroupItem value="yes" id="stress-yes" />
                  <Label htmlFor="stress-yes" className="font-medium cursor-pointer">כן</Label>
                </div>
              </motion.div>
            </RadioGroup>
            
            {answers.stressPoint === "yes" && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
              >
                <Textarea 
                  placeholder="מה גרם לחרטה או לסטרס?"
                  value={answers.stressPointDetails}
                  onChange={(e) => handleTextChange("stressPointDetails", e.target.value)}
                  className="h-20 resize-none focus:ring-2 focus:ring-primary"
                />
              </motion.div>
            )}
          </div>

          {/* Self Control */}
          <div className="space-y-2 bg-card/50 p-4 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">9. איך היית מדרג את תחושת השליטה העצמית שלך היום?</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <HelpCircle className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-sm bg-card" dir="rtl">
                    <p>עד כמה הרגשת שאתה בשליטה על ההחלטות והרגשות שלך.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="px-1">
              <EmotionSlider 
                value={answers.selfControl}
                onChange={handleSelfControlChange}
                labels={controlLabels}
                tooltips={controlTooltips}
              />
            </div>
          </div>

          {/* Submit Button */}
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="pt-4"
          >
            <Button 
              onClick={() => setConfirmDialogOpen(true)} 
              className="w-full bg-primary hover:bg-primary/90 text-lg py-6"
            >
              שלח שאלון
            </Button>
          </motion.div>
        </CardContent>

        {/* Confirmation Dialog */}
        <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
          <DialogContent className="sm:max-w-md rtl bg-card border-primary/20" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">האם לשלוח את השאלון?</DialogTitle>
              <DialogDescription>
                לחיצה על 'שלח' תשמור את התשובות ותנתח את הנתונים.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-center py-6">
              <motion.div 
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
              >
                <CheckCircle2 className="h-20 w-20 text-green-500" />
              </motion.div>
            </div>
            <DialogFooter className="sm:justify-between flex-row-reverse gap-2">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button type="button" onClick={handleSubmit} className="bg-green-600 hover:bg-green-700 w-32">
                  שלח
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button type="button" variant="outline" onClick={() => setConfirmDialogOpen(false)} className="w-32">
                  בטל
                </Button>
              </motion.div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Results Dialog */}
        <Dialog open={resultsDialogOpen} onOpenChange={setResultsDialogOpen} modal={true}>
          <DialogContent className="lg:max-w-4xl md:max-w-2xl sm:max-w-xl rtl bg-card border-primary/20" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <BarChart className="h-5 w-5 text-primary" />
                ניתוח השאלון
              </DialogTitle>
              <DialogDescription>
                המוח שלך מול המכונה - תובנות רגשיות
              </DialogDescription>
            </DialogHeader>
            
            {metrics && (
              <QuestionnaireResults 
                metrics={metrics} 
                insight={insight} 
                interventionReasons={answers.interventionReasons}
              />
            )}
            
            <DialogFooter>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button 
                  type="button" 
                  onClick={() => setResultsDialogOpen(false)}
                  className="px-8"
                >
                  סגור
                </Button>
              </motion.div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Card>
    </motion.div>
  );
};

export default DailyQuestionnaire;
