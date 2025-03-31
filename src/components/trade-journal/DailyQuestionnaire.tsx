import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ArrowRight, ArrowLeft, Brain, CheckCircle, HelpCircle, Info, AlertTriangle, Zap, Moon, Sun, Coffee } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import EmotionButtons from './EmotionButtons';
import RatingButtons from './RatingButtons';
import StarRating from './StarRating';

const formSchema = z.object({
  mood: z.string().min(1, { message: 'נא לבחור את מצב הרוח שלך' }),
  sleep_quality: z.string().min(1, { message: 'נא לבחור את איכות השינה שלך' }),
  physical_readiness: z.string().min(1, { message: 'נא לבחור את רמת המוכנות הפיזית שלך' }),
  mental_preparation: z.string().min(1, { message: 'נא לבחור את רמת ההכנה המנטלית שלך' }),
  discipline: z.string().min(1, { message: 'נא לבחור את רמת המשמעת שלך' }),
  confidence: z.string().min(1, { message: 'נא לבחור את רמת הביטחון שלך' }),
  algorithm_trust: z.string().min(1, { message: 'נא לבחור את רמת האמון שלך באלגוריתם' }),
  market_satisfaction: z.string().min(1, { message: 'נא לדרג את שביעות הרצון שלך מהשוק' }).optional(),
  plan_adherence: z.string().min(1, { message: 'נא לבחור עד כמה עקבת אחר התוכנית' }).optional(),
  stress_level: z.string().min(1, { message: 'נא לבחור את רמת הלחץ שלך' }).optional(),
  intervention_urge: z.string().min(1, { message: 'נא לבחור את רמת הדחף להתערב' }),
  intervention_reasons: z.array(z.string()).optional(),
  other_reason: z.string().optional(),
  daily_reflection: z.string().optional(),
});

interface DailyQuestionnaireProps {
  onSubmit: (data: {
    metrics: {
      ess: number;
      ii: number;
      omrs: number;
      tg: number;
      ai: number;
    },
    insight: string,
    interventionReasons: string[]
  }) => void;
}

const sleepQualityOptions = [
  { value: "1", label: "גרועה", tooltip: "קשיים להירדם, התעוררות מרובות, או שינה קצרה מאוד" },
  { value: "2", label: "חלשה", tooltip: "יותר מדי או פחות מדי שינה, איכות שינה נמוכה" },
  { value: "3", label: "סבירה", tooltip: "שינה בינונית, כמה הפרעות או קושי להירדם" },
  { value: "4", label: "טובה", tooltip: "שינה טובה יחסית, התעוררות מתונה למדי" },
  { value: "5", label: "מצוינת", tooltip: "שינה רציפה ומספקת, התעוררות רעננה" }
];

const physicalReadinessOptions = [
  { value: "1", label: "חלשה מאוד", tooltip: "אנרגיה נמוכה מאוד, קושי בריכוז" },
  { value: "2", label: "חלשה", tooltip: "אנרגיה נמוכה, ריכוז חלקי" },
  { value: "3", label: "בינונית", tooltip: "אנרגיה סבירה, ריכוז סביר" },
  { value: "4", label: "טובה", tooltip: "אנרגיה טובה, ריכוז טוב" },
  { value: "5", label: "מצוינת", tooltip: "אנרגיה גבוהה מאוד, ריכוז מעולה" }
];

const planAdherenceOptions = [
  { value: "not-at-all", label: "כלל לא", tooltip: "סטייה מלאה מהתוכנית" },
  { value: "rarely", label: "מעט", tooltip: "עקבתי אחר מעט מאוד מהתוכנית" },
  { value: "partially", label: "חלקית", tooltip: "עקבתי אחר כמחצית מהתוכנית" },
  { value: "mostly", label: "ברובה", tooltip: "עקבתי אחר רוב התוכנית" },
  { value: "completely", label: "לחלוטין", tooltip: "עקבתי במלואה אחר התוכנית" }
];

const stressLevelOptions = [
  { value: "1", label: "נמוך מאוד", tooltip: "רגוע ושליו לחלוטין" },
  { value: "2", label: "נמוך", tooltip: "מעט לחץ אך ניתן לניהול" },
  { value: "3", label: "בינוני", tooltip: "לחץ ניכר אך עדיין בשליטה" },
  { value: "4", label: "גבוה", tooltip: "רמת לחץ גבוהה, קושי בשליטה" },
  { value: "5", label: "גבוה מאוד", tooltip: "לחץ קיצוני, תחושת הצפה" }
];

const interventionReasons = [
  { id: "fear", label: "פחד מהפסד", tooltip: "חשש מהפסד כספי" },
  { id: "greed", label: "רצון לרווח גדול יותר", tooltip: "חמדנות או FOMO" },
  { id: "distrust", label: "חוסר אמון באלגו", tooltip: "אי-אמון בפעולות האלגוריתם" },
  { id: "fix", label: "רצון לתקן", tooltip: "ניסיון לתקן טעות קודמת" },
  { id: "other", label: "סיבה אחרת", tooltip: "סיבה שאינה מופיעה ברשימה" },
];

const mentalStateTooltips = {
  '1': 'מצב מנטלי ירוד מאוד, קושי בריכוז',
  '2': 'מצב מנטלי לא טוב, ריכוז חלקי',
  '3': 'מצב מנטלי סביר, ריכוז סביר',
  '4': 'מצב מנטלי טוב, ריכוז טוב',
  '5': 'מצב מנטלי מצוין, ריכוז חד ביותר',
};

const disciplineTooltips = {
  '1': 'קושי רב בשמירה על משמעת עצמית',
  '2': 'משמעת עצמית חלשה',
  '3': 'משמעת עצמית בינונית',
  '4': 'משמעת עצמית טובה',
  '5': 'משמעת עצמית גבוהה מאוד',
};

const confidenceTooltips = {
  '1': 'חוסר ביטחון מוחלט ביכולות המסחר',
  '2': 'ביטחון נמוך ביכולות המסחר',
  '3': 'ביטחון בינוני ביכולות המסחר',
  '4': 'ביטחון טוב ביכולות המסחר',
  '5': 'ביטחון מלא ביכולות המסחר',
};

const algorithmTrustTooltips = {
  '1': 'חוסר אמון מוחלט באלגוריתם',
  '2': 'אמון נמוך באלגוריתם',
  '3': 'אמון בינוני באלגוריתם',
  '4': 'אמון טוב באלגוריתם',
  '5': 'אמון מלא באלגוריתם',
};

const interventionUrgeTooltips = {
  '1': 'אין כלל דחף להתערב',
  '2': 'דחף מועט להתערב',
  '3': 'דחף בינוני להתערב',
  '4': 'דחף חזק להתערב',
  '5': 'דחף בלתי נשלט להתערב',
};

const DailyQuestionnaire: React.FC<DailyQuestionnaireProps> = ({ onSubmit }) => {
  const [showOtherReason, setShowOtherReason] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mood: "",
      sleep_quality: "",
      physical_readiness: "",
      mental_preparation: "",
      discipline: "",
      confidence: "",
      algorithm_trust: "",
      market_satisfaction: "",
      plan_adherence: "",
      stress_level: "",
      intervention_urge: "",
      intervention_reasons: [],
      other_reason: "",
      daily_reflection: "",
    },
  });

  const watchedReasons = form.watch("intervention_reasons");
  
  useEffect(() => {
    if (watchedReasons?.includes("other")) {
      setShowOtherReason(true);
    } else {
      setShowOtherReason(false);
    }
  }, [watchedReasons]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    console.log('Form values:', values);
    
    const moodValue = parseInt(values.mood);
    const algorithmTrustValue = parseInt(values.algorithm_trust);
    const confidenceValue = parseInt(values.confidence);
    const disciplineValue = parseInt(values.discipline);
    const mentalPrepValue = parseInt(values.mental_preparation);
    
    const ess = Number(((moodValue + algorithmTrustValue + confidenceValue + disciplineValue + mentalPrepValue) / 5).toFixed(1));
    
    const interventionUrgeValue = parseInt(values.intervention_urge);
    const ii = Number(interventionUrgeValue);
    
    const tg = Number((5 - algorithmTrustValue).toFixed(1));
    
    const omrs = Number(((ess * 0.6) + ((5 - ii) * 0.4)).toFixed(1));
    
    let ai = 0;
    
    if (interventionUrgeValue > 3) ai += 1;
    if (algorithmTrustValue < 3) ai += 1;
    if (disciplineValue < 3) ai += 0.5;
    if (moodValue === 1 || moodValue === 5) ai += 0.5;
    
    if (tg > 2) ai += 1;
    
    let interventionReasonsList: string[] = [];
    if (values.intervention_reasons) {
      interventionReasonsList = values.intervention_reasons.map(reason => {
        if (reason === "other" && values.other_reason) {
          return `other:${values.other_reason}`;
        }
        return reason;
      });
    }
    
    let staticInsight = "";
    if (ai > 2.5) {
      staticInsight = "רמת האזהרה גבוהה. מומלץ להימנע מהתערבויות ולקחת הפסקה קצרה.";
    } else if (tg > 3) {
      staticInsight = "האמון באלגוריתם נמוך מדי היום. כדאי להימנע מהתערבויות.";
    } else if (omrs < 2.5) {
      staticInsight = "המוכנות שלך למסחר היום נמוכה. שקול לקחת יום הפסקה.";
    } else if (ess > 3.5 && ii < 2) {
      staticInsight = "מצבך המנטלי והרגשי נראה יציב היום. המשך עם הגישה הנוכחית.";
    } else {
      staticInsight = "יש לבדוק את כל המדדים ולהחליט אם לסחור היום בהתאם לנתונים.";
    }
    
    const metrics = {
      ess,
      ii,
      omrs,
      tg,
      ai
    };
    
    console.log('Calculated metrics:', metrics);
    
    onSubmit({
      metrics,
      insight: staticInsight,
      interventionReasons: interventionReasonsList
    });
  };

  const goToNextStep = () => {
    const currentValues = form.getValues();
    
    if (currentStep === 1) {
      if (!currentValues.mood || !currentValues.sleep_quality || !currentValues.physical_readiness) {
        form.trigger(['mood', 'sleep_quality', 'physical_readiness']);
        return;
      }
    } else if (currentStep === 2) {
      if (!currentValues.mental_preparation || !currentValues.discipline ||
          !currentValues.confidence || !currentValues.algorithm_trust) {
        form.trigger(['mental_preparation', 'discipline', 'confidence', 'algorithm_trust']);
        return;
      }
    } else if (currentStep === 3) {
      if (!currentValues.intervention_urge) {
        form.trigger(['intervention_urge']);
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const stepInfo = [
    {
      title: "מצב פיזי ורגשי",
      description: "הערכת מצבך הפיזי והרגשי לפני תחילת יום המסחר",
      icon: <Coffee className="h-5 w-5 text-amber-400" />
    },
    {
      title: "מוכנות מנטלית",
      description: "הערכת מצבך המנטלי והכנתך למסחר היום",
      icon: <Brain className="h-5 w-5 text-blue-400" />
    },
    {
      title: "התערבות באלגוריתם",
      description: "הערכת הנטייה להתערב בפעילות האלגוריתם",
      icon: <Zap className="h-5 w-5 text-violet-400" />
    },
    {
      title: "סיכום ותובנות",
      description: "תיעוד רפלקציה יומית ותובנות מהיום",
      icon: <Sun className="h-5 w-5 text-orange-400" />
    }
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="hover-glow shadow-md">
          <CardHeader className="pb-3 border-b border-border/30">
            <div className="flex items-center justify-between mb-2">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {stepInfo[currentStep - 1].icon}
              </motion.div>
              <CardTitle className="text-xl font-bold flex items-center gap-2 text-right">
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  {stepInfo[currentStep - 1].title}
                </span>
              </CardTitle>
            </div>
            <CardDescription className="text-right">
              {stepInfo[currentStep - 1].description}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="pt-6">
            {currentStep === 1 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="mood"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          מצב רוח
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">דרג את מצב הרוח הכללי שלך היום, מ-1 (מצב רוח ירוד) עד 5 (מצב רוח מצוין)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <EmotionButtons 
                          value={field.value} 
                          onChange={field.onChange} 
                          label="" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sleep_quality"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          איכות השינה
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">כיצד היתה איכות השינה שלך אתמול בלילה</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        
                        <div className="flex items-center gap-1">
                          <Moon className="h-4 w-4 text-indigo-400" />
                          <StarRating
                            value={parseInt(field.value || "0")}
                            onChange={(value) => field.onChange(value.toString())}
                          />
                        </div>
                      </div>
                      <FormControl>
                        <RatingButtons
                          value={field.value}
                          onChange={field.onChange}
                          options={sleepQualityOptions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="physical_readiness"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          מוכנות פיזית
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">עד כמה אתה מרגיש מוכן פיזית למסחר היום (אנרגיה, ריכוז)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RatingButtons
                          value={field.value}
                          onChange={field.onChange}
                          options={physicalReadinessOptions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="mental_preparation"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          הכנה מנטלית
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">עד כמה אתה מרגיש מוכן מנטלית למסחר היום</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <EmotionButtons 
                          value={field.value} 
                          onChange={field.onChange}
                          tooltips={mentalStateTooltips}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discipline"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          משמעת עצמית
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">עד כמה אתה מרגיש משמעת עצמית גבוהה היום</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        
                        <div className="flex items-center gap-1">
                          <StarRating
                            value={parseInt(field.value || "0")}
                            onChange={(value) => field.onChange(value.toString())}
                            tooltips={disciplineTooltips}
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confidence"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          ביטחון במסחר
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">עד כמה אתה בטוח ביכולת המסחר שלך היום</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        
                        <div className="flex items-center gap-1">
                          <StarRating
                            value={parseInt(field.value || "0")}
                            onChange={(value) => field.onChange(value.toString())}
                            tooltips={confidenceTooltips}
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="algorithm_trust"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          אמון באלגוריתם
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">עד כמה אתה בוטח באלגוריתם שלך לבצע את המשימה בצורה יעילה</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        
                        <div className="flex items-center gap-1">
                          <StarRating
                            value={parseInt(field.value || "0")}
                            onChange={(value) => field.onChange(value.toString())}
                            tooltips={algorithmTrustTooltips}
                          />
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="intervention_urge"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          דחף להתערב
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">עד כמה אתה מרגיש דחף להתערב בפעילות האלגוריתם</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <EmotionButtons 
                          value={field.value} 
                          onChange={field.onChange}
                          tooltips={interventionUrgeTooltips}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("intervention_urge") && parseInt(form.watch("intervention_urge")) > 1 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-card/20 p-4 rounded-lg border border-border/30">
                      <FormItem className="space-y-3 rtl">
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-base font-medium flex items-center gap-1">
                            סיבות לדחף להתערב
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs bg-card">
                                  <p className="text-xs">בחר את הסיבות שגורמות לך לרצות להתערב בפעולת האלגוריתם</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          {interventionReasons.map((item) => (
                            <FormField
                              key={item.id}
                              control={form.control}
                              name="intervention_reasons"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={item.id}
                                    className="flex flex-row-reverse items-start space-x-0 space-x-reverse space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(item.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value || [], item.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== item.id
                                                )
                                              );
                                        }}
                                      />
                                    </FormControl>
                                    <FormLabel className="mr-2 font-normal">
                                      {item.label}
                                    </FormLabel>
                                  </FormItem>
                                );
                              }}
                            />
                          ))}
                        </div>

                        {showOtherReason && (
                          <FormField
                            control={form.control}
                            name="other_reason"
                            render={({ field }) => (
                              <FormItem className="rtl mt-2">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="פרט את הסיבה האחרת"
                                    className="w-full p-2 bg-card/30 border border-muted rounded-md text-right"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                      </FormItem>
                    </div>
                  </motion.div>
                )}
                
                <FormField
                  control={form.control}
                  name="plan_adherence"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          מעקב אחר תוכנית
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">עד כמה אתה עוקב אחר תוכנית המסחר שלך</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RatingButtons
                          value={field.value}
                          onChange={field.onChange}
                          options={planAdherenceOptions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="stress_level"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          רמת לחץ
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">מהי רמת הלחץ/המתח שלך בזמן המסחר</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RatingButtons
                          value={field.value}
                          onChange={field.onChange}
                          options={stressLevelOptions}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}
            
            {currentStep === 4 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="bg-card/20 p-4 rounded-lg border border-border/30">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    <h3 className="text-base font-medium">תזכורת חשובה</h3>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    רפלקציה יומית היא כלי חשוב לשיפור מתמיד. תיעוד מדויק של רגשות, מחשבות והחלטות 
                    יאפשר לך לזהות דפוסים ולשפר את הביצועים לאורך זמן.
                  </p>
                </div>
              
                <FormField
                  control={form.control}
                  name="daily_reflection"
                  render={({ field }) => (
                    <FormItem className="rtl">
                      <FormLabel className="text-base font-medium flex items-center gap-1">
                        רפלקציה יומית ותובנות
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-card">
                              <p className="text-xs">תאר מה למדת היום, איך הרגשות השפיעו על החלטותיך, ומה תעשה אחרת מחר</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormDescription className="text-sm">
                        תיאור תובנות, לקחים, דפוסים שזיהית היום
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="מה למדת היום? אילו רגשות השפיעו על ההחלטות שלך? אילו דפוסים התנהגותיים זיהית? מה תעשה אחרת בפעם הבאה?"
                          className="h-32 text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </motion.div>
            )}
            
            <div className="flex justify-center items-center gap-2 mt-6">
              {Array.from({ length: totalSteps }, (_, i) => (
                <motion.div
                  key={i}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i + 1 === currentStep
                      ? "w-8 bg-primary"
                      : i + 1 < currentStep
                      ? "w-2 bg-primary/70"
                      : "w-2 bg-muted"
                  }`}
                  initial={{ opacity: 0.6 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                />
              ))}
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              onClick={goToPreviousStep}
              variant="outline"
              disabled={currentStep === 1}
              className="flex items-center gap-1"
            >
              <ArrowRight className="h-4 w-4" />
              הקודם
            </Button>
            
            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={goToNextStep}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90"
              >
                הבא
                <ArrowLeft className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="flex items-center gap-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4" />
                שלח וקבל ניתוח
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
};

export default DailyQuestionnaire;
