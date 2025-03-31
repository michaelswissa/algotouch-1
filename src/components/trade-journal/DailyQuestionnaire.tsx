import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { ArrowRight, Brain, CheckCircle, HelpCircle, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { motion } from 'framer-motion';

// Define the schema for the form
const formSchema = z.object({
  mood: z.string().min(1, { message: 'נא לבחור את מצב הרוח שלך' }),
  confidence: z.string().min(1, { message: 'נא לבחור את רמת הביטחון שלך' }),
  discipline: z.string().min(1, { message: 'נא לבחור את רמת המשמעת שלך' }),
  mental_preparation: z.string().min(1, { message: 'נא לבחור את רמת ההכנה המנטלית שלך' }),
  algorithm_trust: z.string().min(1, { message: 'נא לבחור את רמת האמון שלך באלגוריתם' }),
  intervention_urge: z.string().min(1, { message: 'נא לבחור את רמת הדחף להתערב' }),
  intervention_reasons: z.array(z.string()).optional(),
  other_reason: z.string().optional(),
});

// Define the props for the DailyQuestionnaire component
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

// Define the rating scale options
const ratingScale = [
  { value: "1", label: "1 - נמוך מאוד" },
  { value: "2", label: "2 - נמוך" },
  { value: "3", label: "3 - בינוני" },
  { value: "4", label: "4 - גבוה" },
  { value: "5", label: "5 - גבוה מאוד" }
];

// Define the intervention reasons options
const interventionReasons = [
  { id: "fear", label: "פחד מהפסד" },
  { id: "greed", label: "חמדנות / פומו" },
  { id: "distrust", label: "חוסר אמון באלגו" },
  { id: "fix", label: "רצון לתקן" },
  { id: "other", label: "סיבה אחרת" },
];

const DailyQuestionnaire: React.FC<DailyQuestionnaireProps> = ({ onSubmit }) => {
  const [showOtherReason, setShowOtherReason] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 2;

  // Initialize form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mood: "",
      confidence: "",
      discipline: "",
      mental_preparation: "",
      algorithm_trust: "",
      intervention_urge: "",
      intervention_reasons: [],
      other_reason: "",
    },
  });

  // Watch for intervention_reasons to toggle the other reason field
  const watchedReasons = form.watch("intervention_reasons");
  
  React.useEffect(() => {
    if (watchedReasons?.includes("other")) {
      setShowOtherReason(true);
    } else {
      setShowOtherReason(false);
    }
  }, [watchedReasons]);

  // Handle form submission
  const handleSubmit = (values: z.infer<typeof formSchema>) => {
    console.log('Form values:', values);
    
    // Calculate Emotional Stability Score (ESS)
    const moodValue = parseInt(values.mood);
    const algorithmTrustValue = parseInt(values.algorithm_trust);
    const confidenceValue = parseInt(values.confidence);
    const disciplineValue = parseInt(values.discipline);
    const mentalPrepValue = parseInt(values.mental_preparation);
    
    const ess = Number(((moodValue + algorithmTrustValue + confidenceValue + disciplineValue + mentalPrepValue) / 5).toFixed(1));
    
    // Calculate Intervention Index (II)
    const interventionUrgeValue = parseInt(values.intervention_urge);
    const ii = Number(interventionUrgeValue);
    
    // Calculate Trust Gap (TG)
    const tg = Number((5 - algorithmTrustValue).toFixed(1));
    
    // Calculate Overall Mental Readiness Score (OMRS)
    const omrs = Number(((ess * 0.6) + ((5 - ii) * 0.4)).toFixed(1));
    
    // Calculate Alert Index (AI) - higher means more alert/caution needed
    // Different factors that increase alert level:
    // - High intervention urge (>3)
    // - Low trust in algorithm (<3)
    // - Low discipline (<3)
    // - Extreme mood (1 or 5)
    
    let ai = 0;
    
    if (interventionUrgeValue > 3) ai += 1;
    if (algorithmTrustValue < 3) ai += 1;
    if (disciplineValue < 3) ai += 0.5;
    if (moodValue === 1 || moodValue === 5) ai += 0.5;
    
    // Add 1 to AI if the trust gap is large (>2)
    if (tg > 2) ai += 1;
    
    // Get intervention reasons
    let interventionReasonsList: string[] = [];
    if (values.intervention_reasons) {
      interventionReasonsList = values.intervention_reasons.map(reason => {
        if (reason === "other" && values.other_reason) {
          return `other:${values.other_reason}`;
        }
        return reason;
      });
    }
    
    // Generate a static insight based on metrics (will be replaced by AI)
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
    
    // Prepare the metrics object
    const metrics = {
      ess,
      ii,
      omrs,
      tg,
      ai
    };
    
    console.log('Calculated metrics:', metrics);
    
    // Call the onSubmit callback with the data
    onSubmit({
      metrics,
      insight: staticInsight,
      interventionReasons: interventionReasonsList
    });
  };

  const goToNextStep = () => {
    const currentValues = form.getValues();
    
    // Basic validation for step 1
    if (currentStep === 1) {
      if (!currentValues.mood || !currentValues.confidence || !currentValues.discipline || 
          !currentValues.mental_preparation || !currentValues.algorithm_trust) {
        form.trigger(['mood', 'confidence', 'discipline', 'mental_preparation', 'algorithm_trust']);
        return;
      }
    }
    
    setCurrentStep(prev => Math.min(prev + 1, totalSteps));
  };

  const goToPreviousStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="hover-glow shadow-md">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-xl font-bold flex items-center gap-2 text-right">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: 0 }}
              >
                <Brain className="h-5 w-5 text-primary" />
              </motion.div>
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                שאלון מצב מנטלי יומי
              </span>
            </CardTitle>
            <CardDescription className="text-right">
              מלא את השאלון כדי לקבל תובנה מותאמת אישית מבוססת AI
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium">מצב רוח</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-card">
                              <p className="text-xs">דרג את מצב הרוח הכללי שלך היום, מ-1 (מצב רוח ירוד) עד 5 (מצב רוח מצוין)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row-reverse justify-between rtl"
                        >
                          {ratingScale.map((option) => (
                            <FormItem key={option.value} className="flex items-center space-x-0 space-y-0 space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="mr-2 font-normal text-sm">
                                {option.value === "1" || option.value === "5" ? option.label : option.value}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="algorithm_trust"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium">אמון באלגוריתם</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-card">
                              <p className="text-xs">עד כמה אתה בוטח באלגוריתם שלך לבצע את המשימה בצורה יעילה, מ-1 (אמון נמוך) עד 5 (אמון גבוה)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row-reverse justify-between rtl"
                        >
                          {ratingScale.map((option) => (
                            <FormItem key={option.value} className="flex items-center space-x-0 space-y-0 space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="mr-2 font-normal text-sm">
                                {option.value === "1" || option.value === "5" ? option.label : option.value}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="mental_preparation"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium">הכנה מנטלית</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-card">
                              <p className="text-xs">עד כמה אתה מרגיש מוכן מנטלית למסחר היום, מ-1 (לא מוכן) עד 5 (מוכן מאוד)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row-reverse justify-between rtl"
                        >
                          {ratingScale.map((option) => (
                            <FormItem key={option.value} className="flex items-center space-x-0 space-y-0 space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="mr-2 font-normal text-sm">
                                {option.value === "1" || option.value === "5" ? option.label : option.value}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
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
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium">משמעת עצמית</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-card">
                              <p className="text-xs">עד כמה אתה מרגיש משמעת עצמית גבוהה היום, מ-1 (משמעת נמוכה) עד 5 (משמעת גבוהה)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row-reverse justify-between rtl"
                        >
                          {ratingScale.map((option) => (
                            <FormItem key={option.value} className="flex items-center space-x-0 space-y-0 space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="mr-2 font-normal text-sm">
                                {option.value === "1" || option.value === "5" ? option.label : option.value}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confidence"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium">ביטחון במסחר</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-card">
                              <p className="text-xs">עד כמה אתה בטוח ביכולת המסחר שלך היום, מ-1 (ביטחון נמוך) עד 5 (ביטחון גבוה)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row-reverse justify-between rtl"
                        >
                          {ratingScale.map((option) => (
                            <FormItem key={option.value} className="flex items-center space-x-0 space-y-0 space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="mr-2 font-normal text-sm">
                                {option.value === "1" || option.value === "5" ? option.label : option.value}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="button"
                  onClick={goToNextStep}
                  className="w-full bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
                >
                  המשך
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Button>
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
                  name="intervention_urge"
                  render={({ field }) => (
                    <FormItem className="space-y-3 rtl">
                      <div className="flex items-center gap-2">
                        <FormLabel className="text-base font-medium">דחף להתערב</FormLabel>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs bg-card">
                              <p className="text-xs">עד כמה אתה מרגיש דחף להתערב בפעילות האלגוריתם, מ-1 (אין דחף) עד 5 (דחף חזק)</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <FormControl>
                        <RadioGroup
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          className="flex flex-row-reverse justify-between rtl"
                        >
                          {ratingScale.map((option) => (
                            <FormItem key={option.value} className="flex items-center space-x-0 space-y-0 space-x-reverse">
                              <FormControl>
                                <RadioGroupItem value={option.value} />
                              </FormControl>
                              <FormLabel className="mr-2 font-normal text-sm">
                                {option.value === "1" || option.value === "5" ? option.label : option.value}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {form.watch("intervention_urge") && parseInt(form.watch("intervention_urge")) > 1 && (
                  <FormField
                    control={form.control}
                    name="intervention_reasons"
                    render={() => (
                      <FormItem className="space-y-3 rtl">
                        <div className="flex items-center gap-2">
                          <FormLabel className="text-base font-medium">סיבות לדחף להתערב</FormLabel>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-5 w-5 p-0">
                                  <HelpCircle className="h-3 w-3 text-muted-foreground" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs bg-card">
                                <p className="text-xs">בחר את הסיבות שגורמות לך לרצות להתערב בפעולת האלגוריתם</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
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

                        {/* Other reason text input */}
                        {showOtherReason && (
                          <FormField
                            control={form.control}
                            name="other_reason"
                            render={({ field }) => (
                              <FormItem className="rtl">
                                <FormControl>
                                  <input
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
                    )}
                  />
                )}
                
                <div className="flex flex-row-reverse gap-3 justify-between">
                  <Button
                    type="button"
                    onClick={goToPreviousStep}
                    variant="outline"
                    className="flex-1"
                  >
                    חזרה
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105"
                  >
                    <CheckCircle className="ml-2 h-4 w-4" />
                    שלח וקבל ניתוח
                  </Button>
                </div>
                
                <div className="text-center">
                  <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                    <Info className="h-3.5 w-3.5" />
                    הניתוח יופק באמצעות AI בהתבסס על התשובות
                  </p>
                </div>
              </motion.div>
            )}
            
            {/* Step progress indicator */}
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
        </Card>
      </form>
    </Form>
  );
};

export default DailyQuestionnaire;
