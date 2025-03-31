
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

// Types for our questionnaire answers
interface QuestionnaireAnswers {
  morningMood: number;
  interventionUrge: string;
  interventionReasons: string[];
  interventionReasonOther?: string;
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
  interventionReasonOther: "",
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
    insight = "המצב מעיד על ירידה במוכנות המנטלית. מומלץ לקחת הפסקה של 15-20 דקות ולבחון את גורמי הלחץ שמשפיעים עליך.";
  } else if (metrics.ai > 2.5) {
    insight = "נרשמה פעילות רגשית חריגה. יש להיזהר מפני השפעות רגשיות על קבלת ההחלטות. מומלץ להימנע מהחלטות מסחר גורליות היום.";
  } else if (metrics.tg > 2.5) {
    insight = "זוהה פער אמון משמעותי באלגוריתם. כדאי לשקול בדיקה מחודשת של הסטטיסטיקות והביצועים, ולהבין מאיפה נובע חוסר האמון.";
  } else if (metrics.ii > 3) {
    insight = "נטייה גבוהה להתערבות. מומלץ להגדיר כללים ברורים מתי להתערב ומתי להניח לאלגוריתם לפעול בהתאם לתכנון המקורי.";
  } else {
    insight = "מצבך יציב והמדדים מעידים על שליטה וביטחון גבוהים. אפשר להמשיך במסחר כרגיל.";
  }
  
  return insight;
};

interface DailyQuestionnaireProps {
  onSubmit: (data: {
    metrics: ReturnType<typeof calculateMetrics>,
    insight: string,
    interventionReasons: string[]
  }) => void;
}

const DailyQuestionnaire: React.FC<DailyQuestionnaireProps> = ({ onSubmit }) => {
  const [answers, setAnswers] = useState<QuestionnaireAnswers>(initialAnswers);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const { toast } = useToast();

  // Mood slider config with tooltips
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
    
    // Generate insights
    const generatedInsight = generateInsight(calculatedMetrics);
    
    // Get all reasons including other
    const allReasons = [...answers.interventionReasons];
    if (answers.interventionReasonOther && answers.interventionReasons.includes('other')) {
      allReasons.push(`other:${answers.interventionReasonOther}`);
    }
    
    // Call the onSubmit prop with the results
    onSubmit({
      metrics: calculatedMetrics,
      insight: generatedInsight,
      interventionReasons: allReasons
    });
    
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
      className="rtl"
    >
      <Card className="hover-glow shadow-md">
        <CardHeader className="pb-3 border-b border-border/30">
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-right">
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: 0 }}
            >
              <PieChart className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              שאלון יומי
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-8">
          {/* Section: הרגשה כללית */}
          <div className="space-y-6 rounded-lg p-4 bg-black/20 border border-primary/10">
            <h3 className="text-lg font-medium border-r-4 border-primary/60 pr-2 -mr-4">הרגשה כללית</h3>

            {/* Morning Mood */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                  איך אתה מרגיש הבוקר?
                </Label>
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
              
              <div className="flex justify-between mb-2">
                <div className="flex flex-col items-center space-y-1">
                  <Frown className="h-6 w-6 text-red-500" />
                  <span className="text-xs text-muted-foreground">מתוח מאוד</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <Meh className="h-6 w-6 text-amber-500" />
                  <span className="text-xs text-muted-foreground">ניטרלי</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <Smile className="h-6 w-6 text-green-500" />
                  <span className="text-xs text-muted-foreground">חד ומפוקס</span>
                </div>
              </div>
              
              <Slider
                value={[answers.morningMood]}
                min={1}
                max={5}
                step={1}
                onValueChange={(values) => handleMoodChange(values[0])}
                showValue={true}
                showTooltips={true}
                tooltipLabels={moodTooltips}
                className="mt-6"
              />
            </div>

            {/* Mental Readiness */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">4</span>
                  איך אתה מרגיש פיזית ונפשית למסחר היום?
                </Label>
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
              
              <div className="flex justify-between mb-2">
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-red-400">עייף, מוסח</span>
                  <span className="text-[10px] text-muted-foreground">קושי בריכוז</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-yellow-400">בינוני</span>
                  <span className="text-[10px] text-muted-foreground">ממוצע</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-green-400">חד כמו תער</span>
                  <span className="text-[10px] text-muted-foreground">ערני ומרוכז</span>
                </div>
              </div>
              
              <Slider
                value={[answers.mentalReadiness]}
                min={1}
                max={5}
                step={1}
                onValueChange={(values) => handleMentalReadinessChange(values[0])}
                showValue={true}
                showTooltips={true}
                tooltipLabels={readinessTooltips}
                className="mt-6"
              />
            </div>
          </div>

          {/* Section: יחס לאלגוריתם */}
          <div className="space-y-6 rounded-lg p-4 bg-black/20 border border-primary/10">
            <h3 className="text-lg font-medium border-r-4 border-primary/60 pr-2 -mr-4">יחס לאלגוריתם</h3>

            {/* Intervention Urge */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                  האם הרגשת דחף להתערב באלגו היום?
                </Label>
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
                className="grid grid-cols-2 gap-2 mt-3"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "none" ? "border-green-600 bg-green-900/20" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="none" id="urge-none" className="mr-0 ml-2" />
                    <Label htmlFor="urge-none" className="font-medium cursor-pointer w-full">לא בכלל</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "slight" ? "border-yellow-600 bg-yellow-900/20" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="slight" id="urge-slight" className="mr-0 ml-2" />
                    <Label htmlFor="urge-slight" className="font-medium cursor-pointer w-full">רצון קל</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "strong" ? "border-orange-600 bg-orange-900/20" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="strong" id="urge-strong" className="mr-0 ml-2" />
                    <Label htmlFor="urge-strong" className="font-medium cursor-pointer w-full">רצון חזק</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.interventionUrge === "intervened" ? "border-red-600 bg-red-900/20" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="intervened" id="urge-intervened" className="mr-0 ml-2" />
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
                className="space-y-3 border-r-3 border-red-600/50 pr-4 py-3 bg-red-900/10 rounded-md"
              >
                <Label className="text-base font-medium">מה גרם לך להתערב?</Label>
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                      id="reason-fear" 
                      checked={answers.interventionReasons.includes("fear")}
                      onCheckedChange={(checked) => handleReasonChange("fear", checked as boolean)}
                      className="data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="reason-fear" className="font-medium cursor-pointer">פחד מהפסד</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                      id="reason-fix" 
                      checked={answers.interventionReasons.includes("fix")}
                      onCheckedChange={(checked) => handleReasonChange("fix", checked as boolean)}
                      className="data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="reason-fix" className="font-medium cursor-pointer">רצון לתקן</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                      id="reason-distrust" 
                      checked={answers.interventionReasons.includes("distrust")}
                      onCheckedChange={(checked) => handleReasonChange("distrust", checked as boolean)}
                      className="data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="reason-distrust" className="font-medium cursor-pointer">חוסר אמון באלגו</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <Checkbox 
                      id="reason-greed" 
                      checked={answers.interventionReasons.includes("greed")}
                      onCheckedChange={(checked) => handleReasonChange("greed", checked as boolean)}
                      className="data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="reason-greed" className="font-medium cursor-pointer">חמדנות / פומו</Label>
                  </div>
                  <div className="flex items-center space-x-2 space-x-reverse col-span-2">
                    <Checkbox 
                      id="reason-other" 
                      checked={answers.interventionReasons.includes("other")}
                      onCheckedChange={(checked) => handleReasonChange("other", checked as boolean)}
                      className="data-[state=checked]:bg-red-600 data-[state=checked]:text-white"
                    />
                    <Label htmlFor="reason-other" className="font-medium cursor-pointer">סיבה אחרת</Label>
                  </div>
                  {answers.interventionReasons.includes("other") && (
                    <div className="col-span-2">
                      <Textarea 
                        placeholder="פרט את הסיבה..."
                        value={answers.interventionReasonOther}
                        onChange={(e) => handleTextChange("interventionReasonOther", e.target.value)}
                        className="h-16 resize-none focus:ring-2 focus:ring-red-600 bg-card/50"
                      />
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Algorithm Trust */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                  כמה אתה סומך היום על האלגו?
                </Label>
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
              <div className="flex justify-between mb-2">
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-red-400">אין אמון</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-yellow-400">נייטרלי</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-green-400">סומך לגמרי</span>
                </div>
              </div>
              <Slider
                value={[answers.algorithmTrust]}
                min={1}
                max={5}
                step={1}
                onValueChange={(values) => handleAlgorithmTrustChange(values[0])}
                showValue={true}
                showTooltips={true}
                tooltipLabels={trustTooltips}
                className="mt-6"
              />
            </div>

            {/* Yesterday's Check */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">5</span>
                  בדקת את ביצועי האלגו אתמול?
                </Label>
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
                className="grid grid-cols-2 gap-2 mt-3"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "notChecked" ? "border-primary bg-primary/10" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="notChecked" id="check-none" className="mr-0 ml-2" />
                    <Label htmlFor="check-none" className="font-medium cursor-pointer w-full">לא בדקתי</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "checkedCalm" ? "border-green-600 bg-green-900/20" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="checkedCalm" id="check-calm" className="mr-0 ml-2" />
                    <Label htmlFor="check-calm" className="font-medium cursor-pointer w-full">בדקתי והרגשתי רגוע</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "doubtful" ? "border-yellow-600 bg-yellow-900/20" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="doubtful" id="check-doubt" className="mr-0 ml-2" />
                    <Label htmlFor="check-doubt" className="font-medium cursor-pointer w-full">זה הכניס לי ספק</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <div className={`flex items-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.yesterdayPerformanceCheck === "wantedToIntervene" ? "border-red-600 bg-red-900/20" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="wantedToIntervene" id="check-wanted" className="mr-0 ml-2" />
                    <Label htmlFor="check-wanted" className="font-medium cursor-pointer w-full">גרם לי לרצות להתערב</Label>
                  </div>
                </motion.div>
              </RadioGroup>
            </div>
          </div>

          {/* Section: גורמים חיצוניים */}
          <div className="space-y-6 rounded-lg p-4 bg-black/20 border border-primary/10">
            <h3 className="text-lg font-medium border-r-4 border-primary/60 pr-2 -mr-4">גורמים חיצוניים</h3>

            {/* External Distraction */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">6</span>
                  יש משהו חיצוני שמטריד אותך היום?
                </Label>
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
                className="flex gap-4 mt-3"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.externalDistraction === "no" ? "border-green-500 bg-green-500/10" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="no" id="distraction-no" className="mr-0 ml-2" />
                    <Label htmlFor="distraction-no" className="font-medium cursor-pointer">לא</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.externalDistraction === "yes" ? "border-amber-500 bg-amber-500/10" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="yes" id="distraction-yes" className="mr-0 ml-2" />
                    <Label htmlFor="distraction-yes" className="font-medium cursor-pointer">כן</Label>
                  </div>
                </motion.div>
              </RadioGroup>
              
              {answers.externalDistraction === "yes" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <Textarea 
                    placeholder="פרט את הגורמים החיצוניים המטרידים אותך..."
                    value={answers.externalDistractionDetails}
                    onChange={(e) => handleTextChange("externalDistractionDetails", e.target.value)}
                    className="h-20 resize-none focus:ring-2 focus:ring-amber-500 bg-card/50"
                  />
                </motion.div>
              )}
            </div>

            {/* Stress Point */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">8</span>
                  בסוף היום: האם הייתה נקודה של חרטה / סטרס / פחד?
                </Label>
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
                className="flex gap-4 mt-3"
              >
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.stressPoint === "no" ? "border-green-500 bg-green-500/10" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="no" id="stress-no" className="mr-0 ml-2" />
                    <Label htmlFor="stress-no" className="font-medium cursor-pointer">לא</Label>
                  </div>
                </motion.div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <div className={`flex items-center justify-center space-x-2 space-x-reverse border rounded-md p-3 ${answers.stressPoint === "yes" ? "border-amber-500 bg-amber-500/10" : "border-muted bg-card/60"}`}>
                    <RadioGroupItem value="yes" id="stress-yes" className="mr-0 ml-2" />
                    <Label htmlFor="stress-yes" className="font-medium cursor-pointer">כן</Label>
                  </div>
                </motion.div>
              </RadioGroup>
              
              {answers.stressPoint === "yes" && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3"
                >
                  <Textarea 
                    placeholder="מה גרם לחרטה או לסטרס?"
                    value={answers.stressPointDetails}
                    onChange={(e) => handleTextChange("stressPointDetails", e.target.value)}
                    className="h-20 resize-none focus:ring-2 focus:ring-amber-500 bg-card/50"
                  />
                </motion.div>
              )}
            </div>
          </div>

          {/* Section: משמעת ושליטה */}
          <div className="space-y-6 rounded-lg p-4 bg-black/20 border border-primary/10">
            <h3 className="text-lg font-medium border-r-4 border-primary/60 pr-2 -mr-4">משמעת ושליטה</h3>

            {/* Self Discipline */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">7</span>
                  עד כמה שמרת על משמעת היום?
                </Label>
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
              <div className="flex justify-between mb-2">
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-red-400">פעלתי מהבטן</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-yellow-400">בינוני</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-green-400">ידיים מאחורי הגב</span>
                </div>
              </div>
              <Slider
                value={[answers.selfDiscipline]}
                min={1}
                max={5}
                step={1}
                onValueChange={(values) => handleSelfDisciplineChange(values[0])}
                showValue={true}
                showTooltips={true}
                tooltipLabels={disciplineTooltips}
                className="mt-6"
              />
            </div>

            {/* Self Control */}
            <div className="space-y-3 bg-card/30 p-4 rounded-lg shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  <span className="bg-primary/20 text-primary rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">9</span>
                  איך היית מדרג את תחושת השליטה העצמית שלך היום?
                </Label>
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
              <div className="flex justify-between mb-2">
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-red-400">חסר שליטה</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-yellow-400">בינוני</span>
                </div>
                <div className="flex flex-col items-center space-y-1">
                  <span className="text-xs font-medium text-green-400">שליטה מלאה</span>
                </div>
              </div>
              <Slider
                value={[answers.selfControl]}
                min={1}
                max={5}
                step={1}
                onValueChange={(values) => handleSelfControlChange(values[0])}
                showValue={true}
                showTooltips={true}
                tooltipLabels={controlTooltips}
                className="mt-6"
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
              className="w-full bg-primary hover:bg-primary/90 text-lg py-6 font-medium"
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
      </Card>
    </motion.div>
  );
};

export default DailyQuestionnaire;
