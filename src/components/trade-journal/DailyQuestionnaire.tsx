
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ArrowRight, ArrowLeft, Brain, CheckCircle, HelpCircle, AlertTriangle, BarChart3, LineChart, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import EmotionIcon from './EmotionIcon';
import { format } from 'date-fns';

// Schema for the form
const formSchema = z.object({
  feelingRating: z.string().min(1, { message: 'נא לבחור דירוג' }),
  feelingNotes: z.string().optional(),
  interventionLevel: z.string().min(1, { message: 'נא לבחור אפשרות' }),
  interventionReasons: z.array(z.string()).optional(),
  marketDirection: z.string().min(1, { message: 'נא לבחור כיוון שוק' }),
  mentalState: z.string().min(1, { message: 'נא לבחור דירוג' }),
  mentalStateNotes: z.string().optional(),
  algoPerformanceChecked: z.string().min(1, { message: 'נא לבחור אפשרות' }),
  algoPerformanceNotes: z.string().optional(),
  riskPercentage: z.string().min(1, { message: 'נא להזין אחוז סיכון' }),
  riskComfortLevel: z.string().min(1, { message: 'נא לבחור דירוג' }),
  dailyReflection: z.string().optional(),
});

interface DailyQuestionnaireProps {
  onSubmit: (data: any) => void;
}

const DailyQuestionnaire: React.FC<DailyQuestionnaireProps> = ({ onSubmit }) => {
  const [showFeelingNotesDialog, setShowFeelingNotesDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const today = format(new Date(), 'dd/MM/yyyy');

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      feelingRating: "",
      feelingNotes: "",
      interventionLevel: "",
      interventionReasons: [],
      marketDirection: "",
      mentalState: "",
      mentalStateNotes: "",
      algoPerformanceChecked: "",
      algoPerformanceNotes: "",
      riskPercentage: "1.0",
      riskComfortLevel: "",
      dailyReflection: "",
    },
  });

  // Watch the feeling rating to show the notes dialog when needed
  const feelingRating = form.watch("feelingRating");
  const interventionLevel = form.watch("interventionLevel");
  const algoPerformanceChecked = form.watch("algoPerformanceChecked");

  useEffect(() => {
    if (feelingRating === "1" || feelingRating === "2") {
      setShowFeelingNotesDialog(true);
    }
  }, [feelingRating]);

  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    console.log('Form values:', values);
    
    // Create a data object with formatted values for the report
    const reportData = {
      date: today,
      feeling: {
        rating: parseInt(values.feelingRating),
        notes: values.feelingNotes || "",
      },
      intervention: {
        level: values.interventionLevel,
        reasons: values.interventionReasons || [],
      },
      marketDirection: values.marketDirection,
      mentalState: {
        rating: parseInt(values.mentalState),
        notes: values.mentalStateNotes || "",
      },
      algoPerformance: {
        checked: values.algoPerformanceChecked,
        notes: values.algoPerformanceNotes || "",
      },
      riskManagement: {
        percentage: parseFloat(values.riskPercentage),
        comfortLevel: parseInt(values.riskComfortLevel),
      },
      reflection: values.dailyReflection || "",
    };
    
    onSubmit(reportData);
  };

  const goToNextStep = () => {
    if (currentStep === 1) {
      if (!form.getValues("feelingRating") || !form.getValues("interventionLevel") || !form.getValues("marketDirection")) {
        form.trigger(["feelingRating", "interventionLevel", "marketDirection"]);
        return;
      }
    } else if (currentStep === 2) {
      if (!form.getValues("mentalState") || !form.getValues("algoPerformanceChecked")) {
        form.trigger(["mentalState", "algoPerformanceChecked"]);
        return;
      }
    } else if (currentStep === 3) {
      if (!form.getValues("riskPercentage") || !form.getValues("riskComfortLevel")) {
        form.trigger(["riskPercentage", "riskComfortLevel"]);
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
      title: "הרגשה ומצב שוק",
      description: "כיצד אתה מרגיש ומה כיוון השוק היום",
      icon: <Brain className="h-5 w-5 text-blue-400" />
    },
    {
      title: "מצב מנטלי וביצועי אלגו",
      description: "הערכת המוכנות המנטלית ובדיקת ביצועי האלגו",
      icon: <BarChart3 className="h-5 w-5 text-amber-400" />
    },
    {
      title: "ניהול סיכונים",
      description: "הגדרת רמת הסיכון והנוחות עם הפסדים אפשריים",
      icon: <AlertTriangle className="h-5 w-5 text-orange-400" />
    },
    {
      title: "רפלקציה ותובנות",
      description: "סיכום התובנות והלקחים מהיום",
      icon: <CheckCircle className="h-5 w-5 text-green-400" />
    }
  ];

  const getMarketDirectionIcon = (direction: string) => {
    switch (direction) {
      case "up":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "sideways":
        return <Minus className="h-5 w-5 text-yellow-500" />;
      case "down":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <LineChart className="h-5 w-5 text-gray-500" />;
    }
  };

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
                {/* איך אתה מרגיש? */}
                <FormField
                  control={form.control}
                  name="feelingRating"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          איך אתה מרגיש?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">דרג את מצב הרוח הכללי שלך היום (1: מתוח, 3: ניטרלי, 5: רגוע ומפוקס)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <div className="flex justify-between items-center gap-2 rtl">
                          {["1", "2", "3", "4", "5"].map((value) => (
                            <div 
                              key={value} 
                              className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${field.value === value ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                              onClick={() => field.onChange(value)}
                            >
                              <div className={`p-2 rounded-full ${field.value === value ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-secondary/40'}`}>
                                <EmotionIcon 
                                  emotion={value} 
                                  size={28} 
                                  animated={field.value === value} 
                                />
                              </div>
                              <span className="text-xs mt-1">{
                                value === "1" ? "מתוח מאוד" :
                                value === "2" ? "מתוח" :
                                value === "3" ? "ניטרלי" :
                                value === "4" ? "רגוע" :
                                "מפוקס מאוד"
                              }</span>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* האם הרגשת דחף להתערב באלגו היום? */}
                <FormField
                  control={form.control}
                  name="interventionLevel"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          האם הרגשת דחף להתערב באלגו היום?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">באיזו מידה הרגשת צורך להתערב בפעילות האלגוריתם</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-col space-y-1 rtl"
                        >
                          <div className="flex items-center space-x-reverse space-x-2">
                            <RadioGroupItem value="none" id="none" />
                            <FormLabel htmlFor="none" className="font-normal">לא בכלל</FormLabel>
                          </div>
                          <div className="flex items-center space-x-reverse space-x-2">
                            <RadioGroupItem value="slight" id="slight" />
                            <FormLabel htmlFor="slight" className="font-normal">רצון קל</FormLabel>
                          </div>
                          <div className="flex items-center space-x-reverse space-x-2">
                            <RadioGroupItem value="strong" id="strong" />
                            <FormLabel htmlFor="strong" className="font-normal">רצון חזק</FormLabel>
                          </div>
                          <div className="flex items-center space-x-reverse space-x-2">
                            <RadioGroupItem value="actual" id="actual" />
                            <FormLabel htmlFor="actual" className="font-normal">התערבתי בפועל</FormLabel>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* סיבות להתערבות - מוצג רק אם נבחר "התערבתי בפועל" */}
                {interventionLevel === "actual" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="bg-card/20 p-4 rounded-lg border border-border/30">
                      <FormItem className="space-y-3 rtl">
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-base font-medium flex items-center gap-1">
                            מה גרם לך להתערב?
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="h-4 w-4 text-muted-foreground" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs bg-card">
                                  <p className="text-xs">סמן את הסיבות שגרמו לך להתערב בפעילות האלגוריתם</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </FormLabel>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <FormField
                            control={form.control}
                            name="interventionReasons"
                            render={({ field }) => (
                              <FormItem className="flex flex-row-reverse items-start space-x-0 space-x-reverse space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("fear")}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), "fear"])
                                        : field.onChange(field.value?.filter(value => value !== "fear"));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="mr-2 font-normal">פחד מהפסד</FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="interventionReasons"
                            render={({ field }) => (
                              <FormItem className="flex flex-row-reverse items-start space-x-0 space-x-reverse space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("fix")}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), "fix"])
                                        : field.onChange(field.value?.filter(value => value !== "fix"));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="mr-2 font-normal">רצון לתקן</FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="interventionReasons"
                            render={({ field }) => (
                              <FormItem className="flex flex-row-reverse items-start space-x-0 space-x-reverse space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("distrust")}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), "distrust"])
                                        : field.onChange(field.value?.filter(value => value !== "distrust"));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="mr-2 font-normal">חוסר אמון באלגו</FormLabel>
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="interventionReasons"
                            render={({ field }) => (
                              <FormItem className="flex flex-row-reverse items-start space-x-0 space-x-reverse space-y-0">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes("greed")}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), "greed"])
                                        : field.onChange(field.value?.filter(value => value !== "greed"));
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="mr-2 font-normal">חמדנות / פומו</FormLabel>
                              </FormItem>
                            )}
                          />
                        </div>
                      </FormItem>
                    </div>
                  </motion.div>
                )}

                {/* כיוון השוק */}
                <FormField
                  control={form.control}
                  name="marketDirection"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          מה כיוון השוק היום?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">באיזה כיוון נע השוק היום באופן כללי</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <div className="flex justify-between items-center gap-2 rtl">
                          {[
                            { value: "up", label: "עולה", icon: <TrendingUp className="h-6 w-6 text-green-500" /> },
                            { value: "sideways", label: "מדשדש", icon: <Minus className="h-6 w-6 text-yellow-500" /> },
                            { value: "down", label: "יורד", icon: <TrendingDown className="h-6 w-6 text-red-500" /> }
                          ].map((option) => (
                            <div 
                              key={option.value} 
                              className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${field.value === option.value ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                              onClick={() => field.onChange(option.value)}
                            >
                              <div className={`p-3 rounded-lg ${field.value === option.value ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-secondary/40'}`}>
                                {option.icon}
                              </div>
                              <span className="text-sm mt-1">{option.label}</span>
                            </div>
                          ))}
                        </div>
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
                {/* איך אתה מרגיש מנטלית בנוגע למסחר היום? */}
                <FormField
                  control={form.control}
                  name="mentalState"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          איך אתה מרגיש מנטלית בנוגע למסחר היום?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">דרג מ-1 (השוק תנודתי, אני חושש) עד 5 (השוק נראה יציב, אני בטוח)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <div className="flex justify-between items-center gap-2 rtl">
                          {["1", "2", "3", "4", "5"].map((value) => (
                            <div 
                              key={value} 
                              className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${field.value === value ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                              onClick={() => field.onChange(value)}
                            >
                              <div className={`p-2 rounded-full ${field.value === value ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-secondary/40'}`}>
                                <EmotionIcon 
                                  emotion={value} 
                                  size={28} 
                                  animated={field.value === value} 
                                />
                              </div>
                              <span className="text-xs mt-1">{
                                value === "1" ? "חושש מאוד" :
                                value === "2" ? "לא בטוח" :
                                value === "3" ? "ניטרלי" :
                                value === "4" ? "בטוח" :
                                "בטוח מאוד"
                              }</span>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* הערות על מצב מנטלי */}
                <FormField
                  control={form.control}
                  name="mentalStateNotes"
                  render={({ field }) => (
                    <FormItem className="rtl">
                      <FormLabel className="text-sm font-medium flex items-center gap-1">
                        הערות על איך ההרגשה משפיעה על קבלת ההחלטות (אופציונלי)
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="תאר כיצד המצב המנטלי משפיע על קבלת ההחלטות שלך במסחר..."
                          className="h-20 text-right"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* בדיקת ביצועי האלגו */}
                <FormField
                  control={form.control}
                  name="algoPerformanceChecked"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          בדקת את ביצועי האלגו בשבוע האחרון?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">האם ניתחת את ביצועי האלגוריתם בתקופה האחרונה</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex space-x-reverse rtl space-x-4"
                        >
                          <div className="flex items-center space-x-reverse space-x-2">
                            <RadioGroupItem value="yes" id="yes" />
                            <FormLabel htmlFor="yes" className="font-normal">בדקתי</FormLabel>
                          </div>
                          <div className="flex items-center space-x-reverse space-x-2">
                            <RadioGroupItem value="no" id="no" />
                            <FormLabel htmlFor="no" className="font-normal">לא בדקתי</FormLabel>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* מסקנות מבדיקת האלגו - מוצג רק אם נבחר "בדקתי" */}
                {algoPerformanceChecked === "yes" && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                  >
                    <FormField
                      control={form.control}
                      name="algoPerformanceNotes"
                      render={({ field }) => (
                        <FormItem className="rtl">
                          <FormLabel className="text-sm font-medium flex items-center gap-1">
                            מהן המסקנות העיקריות או השיפורים שזיהית?
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              {...field}
                              placeholder="תאר את המסקנות העיקריות מניתוח ביצועי האלגוריתם..."
                              className="h-20 text-right"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </motion.div>
                )}
              </motion.div>
            )}
            
            {currentStep === 3 && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* כמה אחוז אתה מסכן לכל עסקה? */}
                <FormField
                  control={form.control}
                  name="riskPercentage"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          כמה אחוז אתה מסכן לכל עסקה?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">אחוז הסיכון מתוך ההון הכולל שאתה מוכן לסכן בכל עסקה (0.1% - 2.0%)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                        <span className="font-medium text-primary">{field.value}%</span>
                      </div>
                      <FormControl>
                        <div className="flex items-center space-x-2 rtl space-x-reverse">
                          <span className="text-sm">0.1%</span>
                          <Slider
                            defaultValue={[parseFloat(field.value)]}
                            max={2.0}
                            min={0.1}
                            step={0.1}
                            onValueChange={(vals) => field.onChange(vals[0].toString())}
                            className="flex-1"
                          />
                          <span className="text-sm">2.0%</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* מה מידת הנוחות שלך עם ההפסדים האפשריים ברמת הסיכון הנוכחית? */}
                <FormField
                  control={form.control}
                  name="riskComfortLevel"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel className="text-base font-medium flex items-center gap-1">
                          מה מידת הנוחות שלך עם ההפסדים האפשריים ברמת הסיכון הנוכחית?
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">דרג מ-1 (לא נוח בכלל) עד 5 (נוח לגמרי)</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </FormLabel>
                      </div>
                      <FormControl>
                        <div className="flex justify-between items-center gap-2 rtl">
                          {["1", "2", "3", "4", "5"].map((value) => (
                            <div 
                              key={value} 
                              className={`flex flex-col items-center cursor-pointer transition-all duration-200 ${field.value === value ? 'scale-110' : 'opacity-70 hover:opacity-100'}`}
                              onClick={() => field.onChange(value)}
                            >
                              <div className={`p-2 rounded-full ${field.value === value ? 'bg-primary/20 ring-2 ring-primary' : 'hover:bg-secondary/40'}`}>
                                <EmotionIcon 
                                  emotion={value} 
                                  size={28} 
                                  animated={field.value === value} 
                                />
                              </div>
                              <span className="text-xs mt-1">{
                                value === "1" ? "לא נוח כלל" :
                                value === "2" ? "נוחות נמוכה" :
                                value === "3" ? "נוחות בינונית" :
                                value === "4" ? "נוחות טובה" :
                                "נוח לגמרי"
                              }</span>
                            </div>
                          ))}
                        </div>
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
                  name="dailyReflection"
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
                              <p className="text-xs">רשום כאן תובנות, נקודות לשיפור או דברים שתרצה לשמר להמשך</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </FormLabel>
                      <FormDescription className="text-sm">
                        מה למדת היום?
                      </FormDescription>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="רשום כאן תובנות, נקודות לשיפור או דברים שתרצה לשמר להמשך..."
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
                שלח וצור דוח
              </Button>
            )}
          </CardFooter>
        </Card>
      </form>

      {/* Dialog for feeling notes when user selects 1 or 2 */}
      <Dialog open={showFeelingNotesDialog} onOpenChange={setShowFeelingNotesDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-right">הערות נוספות על המצב הרגשי</DialogTitle>
            <DialogDescription className="text-right">
              תוכל לשתף פרטים נוספים על הסיבות למצב הרגשי שלך היום
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <FormField
              control={form.control}
              name="feelingNotes"
              render={({ field }) => (
                <FormItem className="rtl">
                  <FormLabel className="text-sm font-medium">תיאור הסיבות למצב הרגשי</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="לדוגמה: הרגשתי לחץ בגלל חדשות מסוימות או היה לי יום רגוע עם קצת חשש ממצבים מסוימים..."
                      className="h-24 text-right"
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <div className="flex justify-end mt-4">
              <Button 
                onClick={() => setShowFeelingNotesDialog(false)}
                className="bg-primary hover:bg-primary/90"
              >
                שמור
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Form>
  );
};

export default DailyQuestionnaire;
