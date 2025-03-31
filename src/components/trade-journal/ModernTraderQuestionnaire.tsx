
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { ChevronRight, ChevronLeft, Send, Save, Check } from 'lucide-react';
import { format } from 'date-fns';

// Define form schema
const formSchema = z.object({
  emotionalState: z.string(),
  emotionalNotes: z.string().optional(),
  algoIntervention: z.enum(['none', 'wanted', 'intervened']),
  interventionReasons: z.array(z.string()).optional(),
  marketSurprise: z.enum(['no', 'yes']),
  marketSurpriseNotes: z.string().optional(),
  confidenceLevel: z.string(),
  algoPerformanceChecked: z.enum(['no', 'yes']),
  algoPerformanceNotes: z.string().optional(),
  riskPercentage: z.string(),
  riskComfortLevel: z.string(),
  dailyInsight: z.string().optional(),
}).refine(
  (data) => {
    if (data.algoPerformanceChecked === 'yes') {
      return !!data.algoPerformanceNotes;
    }
    return true;
  },
  {
    message: "אנא הזן את התובנה מהבדיקה",
    path: ["algoPerformanceNotes"],
  }
).refine(
  (data) => {
    if (data.marketSurprise === 'yes') {
      return !!data.marketSurpriseNotes;
    }
    return true;
  },
  {
    message: "אנא תאר מה הפתיע אותך",
    path: ["marketSurpriseNotes"],
  }
).refine(
  (data) => {
    if (['😣', '😕'].includes(data.emotionalState)) {
      return !!data.emotionalNotes;
    }
    return true;
  },
  {
    message: "אנא שתף מה השפיע עליך היום",
    path: ["emotionalNotes"],
  }
);

type FormValues = z.infer<typeof formSchema>;

interface ModernTraderQuestionnaireProps {
  onSubmit: (data: any) => void;
}

const ModernTraderQuestionnaire: React.FC<ModernTraderQuestionnaireProps> = ({ onSubmit }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [showInterventionReasons, setShowInterventionReasons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue, trigger, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emotionalState: '',
      emotionalNotes: '',
      algoIntervention: 'none',
      interventionReasons: [],
      marketSurprise: 'no',
      marketSurpriseNotes: '',
      confidenceLevel: '3',
      algoPerformanceChecked: 'no',
      algoPerformanceNotes: '',
      riskPercentage: '0.5',
      riskComfortLevel: '3',
      dailyInsight: '',
    }
  });

  const emotionalState = watch('emotionalState');
  const algoIntervention = watch('algoIntervention');
  const marketSurprise = watch('marketSurprise');
  const algoPerformanceChecked = watch('algoPerformanceChecked');
  const riskPercentage = watch('riskPercentage');
  const riskComfortLevel = watch('riskComfortLevel');

  React.useEffect(() => {
    setShowInterventionReasons(algoIntervention === 'intervened');
  }, [algoIntervention]);

  const steps = [
    { id: 'emotional', title: '😌 איך הרגשת במהלך המסחר היום?' },
    { id: 'intervention', title: '🔁 שינית פעולה של האלגו היום?' },
    { id: 'market', title: '📈 האם כיוון השוק הפתיע אותך היום?' },
    { id: 'confidence', title: '🧠 איך היית מדרג את רמת הביטחון שלך במסחר היום?' },
    { id: 'performance', title: '📊 האם בדקת את ביצועי האלגו בשבוע האחרון?' },
    { id: 'risk', title: '⚙️ שאלות שיפור מהיר' },
    { id: 'insight', title: '✍️ תובנה יומית – מה לקחת מהיום הזה?' },
  ];

  const nextStep = async () => {
    // Validate current step before proceeding
    const fieldsToValidate: Record<number, (keyof FormValues)[]> = {
      0: ['emotionalState', 'emotionalNotes'],
      1: ['algoIntervention', 'interventionReasons'],
      2: ['marketSurprise', 'marketSurpriseNotes'],
      3: ['confidenceLevel'],
      4: ['algoPerformanceChecked', 'algoPerformanceNotes'],
      5: ['riskPercentage', 'riskComfortLevel'],
      6: ['dailyInsight']
    };
    
    const isStepValid = await trigger(fieldsToValidate[currentStep]);
    
    if (isStepValid) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  const onFormSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    // Format the data for the report
    const formattedData = {
      date: format(new Date(), 'dd/MM/yyyy'),
      emotional: {
        state: data.emotionalState,
        notes: data.emotionalNotes
      },
      intervention: {
        level: data.algoIntervention,
        reasons: data.interventionReasons || []
      },
      market: {
        surprise: data.marketSurprise,
        notes: data.marketSurpriseNotes
      },
      confidence: {
        level: parseInt(data.confidenceLevel)
      },
      algoPerformance: {
        checked: data.algoPerformanceChecked,
        notes: data.algoPerformanceNotes
      },
      risk: {
        percentage: parseFloat(data.riskPercentage),
        comfortLevel: parseInt(data.riskComfortLevel)
      },
      insight: data.dailyInsight
    };
    
    console.log('Form values:', data);
    console.log('Formatted data:', formattedData);
    
    // Submit the data
    onSubmit(formattedData);
    setIsSubmitting(false);
  };

  // Animation variants
  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0
    })
  };

  const [direction, setDirection] = useState(0);

  const emotionalIcons = [
    { value: '😣', label: 'מתוח' },
    { value: '😕', label: 'לא רגוע' },
    { value: '😐', label: 'ניטרלי' },
    { value: '🙂', label: 'רגוע' },
    { value: '😎', label: 'מפוקס ובטוח' }
  ];

  const interventionReasons = [
    { id: 'fear', label: 'פחד מהפסד' },
    { id: 'fix', label: 'רצון לתקן עסקה' },
    { id: 'distrust', label: 'חוסר אמון באלגו' },
    { id: 'greed', label: 'חמדנות / FOMO' },
  ];

  return (
    <div className="max-w-3xl mx-auto">
      <Card className="overflow-hidden shadow-lg border-primary/20 bg-gradient-to-br from-card/90 to-card hover-glow">
        <CardHeader className="relative pb-2 bg-primary/5">
          <CardTitle className="text-2xl text-center font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            🚀 שאלון סוחר יומי – AlgoTouch
          </CardTitle>
          
          {/* Progress indicator */}
          <div className="flex justify-center mt-4">
            {steps.map((step, index) => (
              <div 
                key={step.id}
                className={`h-1 mx-1 rounded-full transition-all duration-300 ${
                  index === currentStep ? 'w-8 bg-primary' : 
                  index < currentStep ? 'w-4 bg-primary/60' : 'w-4 bg-muted'
                }`}
              />
            ))}
          </div>
        </CardHeader>
        
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <CardContent className="p-6">
            <AnimatePresence initial={false} custom={direction} mode="wait">
              <motion.div
                key={currentStep}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "tween", duration: 0.3 }}
                className="min-h-[400px]"
              >
                {currentStep === 0 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {steps[0].title}
                    </h2>
                    
                    <div className="flex justify-between items-center gap-3 mt-6">
                      {emotionalIcons.map((icon) => (
                        <div 
                          key={icon.value} 
                          className="flex flex-col items-center gap-2"
                        >
                          <button
                            type="button"
                            onClick={() => setValue('emotionalState', icon.value)}
                            className={`text-4xl p-3 rounded-full transition-all duration-300 transform ${
                              emotionalState === icon.value 
                                ? 'bg-primary/20 ring-2 ring-primary scale-125' 
                                : 'hover:bg-primary/10 hover:scale-110'
                            }`}
                          >
                            {icon.value}
                          </button>
                          <span className="text-sm font-medium">{icon.label}</span>
                        </div>
                      ))}
                    </div>
                    
                    {errors.emotionalState && (
                      <p className="text-red-500 text-sm mt-1">אנא בחר את הרגשתך</p>
                    )}
                    
                    {(emotionalState === '😣' || emotionalState === '😕') && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 space-y-2"
                      >
                        <Label htmlFor="emotionalNotes">תרצה לשתף מה השפיע עליך היום?</Label>
                        <Textarea
                          id="emotionalNotes"
                          placeholder="שתף את ההרגשה שלך..."
                          className="border-primary/20 focus-visible:ring-primary"
                          {...register('emotionalNotes')}
                        />
                        {errors.emotionalNotes && (
                          <p className="text-red-500 text-sm">
                            {errors.emotionalNotes.message}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
                
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {steps[1].title}
                    </h2>
                    
                    <RadioGroup
                      value={algoIntervention}
                      onValueChange={(value) => setValue('algoIntervention', value as 'none' | 'wanted' | 'intervened')}
                      className="flex flex-col gap-4 mt-6"
                    >
                      <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                        <RadioGroupItem value="none" id="none" />
                        <Label htmlFor="none" className="text-lg font-medium flex items-center gap-2">
                          <span className="text-2xl">✅</span> לא שיניתי
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                        <RadioGroupItem value="wanted" id="wanted" />
                        <Label htmlFor="wanted" className="text-lg font-medium flex items-center gap-2">
                          <span className="text-2xl">⚠️</span> רציתי להתערב
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                        <RadioGroupItem value="intervened" id="intervened" />
                        <Label htmlFor="intervened" className="text-lg font-medium flex items-center gap-2">
                          <span className="text-2xl">❗</span> שיניתי בפועל
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    {errors.algoIntervention && (
                      <p className="text-red-500 text-sm">אנא בחר אפשרות</p>
                    )}
                    
                    {showInterventionReasons && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20"
                      >
                        <h3 className="text-lg font-medium mb-3">מה גרם לך להתערב?</h3>
                        <div className="grid grid-cols-2 gap-4">
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
                                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                              />
                              <Label
                                htmlFor={reason.id}
                                className="text-md font-medium cursor-pointer"
                              >
                                {reason.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
                
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {steps[2].title}
                    </h2>
                    
                    <RadioGroup
                      value={marketSurprise}
                      onValueChange={(value) => setValue('marketSurprise', value as 'no' | 'yes')}
                      className="flex flex-col gap-4 mt-6"
                    >
                      <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                        <RadioGroupItem value="no" id="no-surprise" />
                        <Label htmlFor="no-surprise" className="text-lg font-medium">
                          לא, השוק התנהג כצפוי
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                        <RadioGroupItem value="yes" id="yes-surprise" />
                        <Label htmlFor="yes-surprise" className="text-lg font-medium">
                          כן, השוק היה שונה מהציפיות שלי
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    {errors.marketSurprise && (
                      <p className="text-red-500 text-sm">אנא בחר אפשרות</p>
                    )}
                    
                    {marketSurprise === 'yes' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 space-y-2"
                      >
                        <Label htmlFor="marketSurpriseNotes">מה הפתיע אותך?</Label>
                        <Textarea
                          id="marketSurpriseNotes"
                          placeholder="תאר במה השוק היה שונה מציפיותיך..."
                          className="border-primary/20 focus-visible:ring-primary"
                          {...register('marketSurpriseNotes')}
                        />
                        {errors.marketSurpriseNotes && (
                          <p className="text-red-500 text-sm">
                            {errors.marketSurpriseNotes.message}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
                
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {steps[3].title}
                    </h2>
                    
                    <div className="mt-8 space-y-8">
                      <Label className="block text-lg mb-6">סרגל מ-1 עד 5:</Label>
                      
                      <div className="relative pt-8">
                        <div className="absolute -top-2 left-0 right-0 flex justify-between px-2">
                          <span className="text-sm font-medium text-red-500">חשש מתנודתיות</span>
                          <span className="text-sm font-medium text-green-500">ביטחון גבוה ותחושת שליטה</span>
                        </div>
                        
                        <Slider
                          min={1}
                          max={5}
                          step={1}
                          value={[parseInt(watch('confidenceLevel'))]}
                          onValueChange={(value) => setValue('confidenceLevel', value[0].toString())}
                          className="my-6"
                        />
                        
                        <div className="flex justify-between mt-2">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <div 
                              key={value} 
                              className={`h-12 w-12 flex items-center justify-center rounded-full border-2 transition-all duration-300 ${
                                parseInt(watch('confidenceLevel')) === value 
                                  ? 'bg-primary/20 border-primary scale-110' 
                                  : 'bg-card border-muted-foreground/20'
                              }`}
                              onClick={() => setValue('confidenceLevel', value.toString())}
                            >
                              <span className="font-bold text-lg">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {steps[4].title}
                    </h2>
                    
                    <RadioGroup
                      value={algoPerformanceChecked}
                      onValueChange={(value) => setValue('algoPerformanceChecked', value as 'no' | 'yes')}
                      className="flex flex-col gap-4 mt-6"
                    >
                      <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                        <RadioGroupItem value="no" id="not-checked" />
                        <Label htmlFor="not-checked" className="text-lg font-medium">
                          לא הספקתי
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-3 space-x-reverse p-3 rounded-lg bg-primary/5 hover:bg-primary/10 transition">
                        <RadioGroupItem value="yes" id="checked" />
                        <Label htmlFor="checked" className="text-lg font-medium">
                          כן בדקתי
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    {errors.algoPerformanceChecked && (
                      <p className="text-red-500 text-sm">אנא בחר אפשרות</p>
                    )}
                    
                    {algoPerformanceChecked === 'yes' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 space-y-2"
                      >
                        <Label htmlFor="algoPerformanceNotes">תובנה מהבדיקה שלך:</Label>
                        <Textarea
                          id="algoPerformanceNotes"
                          placeholder="שתף תובנה מבדיקת הביצועים..."
                          className="border-primary/20 focus-visible:ring-primary"
                          {...register('algoPerformanceNotes')}
                        />
                        {errors.algoPerformanceNotes && (
                          <p className="text-red-500 text-sm">
                            {errors.algoPerformanceNotes.message}
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                )}
                
                {currentStep === 5 && (
                  <div className="space-y-8">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {steps[5].title}
                    </h2>
                    
                    <div className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <Label className="text-lg">אחוז סיכון בעסקה:</Label>
                          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
                            {riskPercentage}%
                          </div>
                        </div>
                        
                        <Slider
                          min={0.1}
                          max={2.0}
                          step={0.1}
                          value={[parseFloat(riskPercentage)]}
                          onValueChange={(value) => setValue('riskPercentage', value[0].toString())}
                          className="my-6"
                        />
                        
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>מינימלי (0.1%)</span>
                          <span>מקסימלי (2.0%)</span>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div className="space-y-4">
                        <Label className="block text-lg">
                          מה מידת הנוחות שלך עם ההפסדים האפשריים ברמת הסיכון הזו?
                        </Label>
                        
                        <div className="flex justify-between gap-4 mt-6">
                          {[1, 2, 3, 4, 5].map((value) => (
                            <div 
                              key={value} 
                              className={`flex-1 text-center p-3 rounded-lg transition-all duration-300 cursor-pointer ${
                                parseInt(riskComfortLevel) === value 
                                  ? value < 3 ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300' 
                                  : value === 3 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300' 
                                  : 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                                  : 'bg-muted/40 hover:bg-muted'
                              }`}
                              onClick={() => setValue('riskComfortLevel', value.toString())}
                            >
                              <div className="font-bold text-xl mb-1">{value}</div>
                              <div className="text-xs">
                                {value === 1 && '🟥 לא נוח בכלל'}
                                {value === 2 && 'לא נוח'}
                                {value === 3 && '🟨 ניטרלי'}
                                {value === 4 && 'נוח'}
                                {value === 5 && '🟩 נוח לגמרי'}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {currentStep === 6 && (
                  <div className="space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                      {steps[6].title}
                    </h2>
                    
                    <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 mt-4 mb-6">
                      <p className="text-sm text-blue-800 dark:text-blue-300">
                        תכתוב כאן כל דבר שתרצה לזכור: למידה, טעויות, תובנות או דברים לשמר.
                      </p>
                    </div>
                    
                    <Textarea
                      placeholder="שתף את התובנות שלך מהיום..."
                      className="min-h-[200px] border-primary/20 focus-visible:ring-primary"
                      {...register('dailyInsight')}
                    />
                    
                    <div className="p-4 bg-primary/5 rounded-lg mt-6">
                      <h3 className="font-medium text-primary mb-2">🗂️ שמירה בפתקים</h3>
                      <p className="text-sm text-muted-foreground">
                        בעת שליחה, הטופס נשמר אוטומטית כפתק יומי עם כל המידע החשוב שהזנת.
                      </p>
                    </div>
                  </div>
                )}
                
                {currentStep === 7 && (
                  <div className="space-y-6 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                      className="mx-auto bg-green-100 dark:bg-green-900/30 p-6 rounded-full w-24 h-24 flex items-center justify-center"
                    >
                      <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
                    </motion.div>
                    
                    <h2 className="text-xl font-semibold">השאלון מוכן לשליחה!</h2>
                    <p className="text-muted-foreground">
                      תודה על מילוי השאלון היומי. המידע שהזנת יסייע לך לשפר את המסחר ולזהות דפוסים לאורך זמן.
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </CardContent>
          
          <CardFooter className="p-6 border-t border-border/30 bg-muted/20">
            <div className="w-full flex justify-between items-center">
              {currentStep > 0 && currentStep < steps.length ? (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setDirection(-1);
                    prevStep();
                  }}
                  className="gap-2"
                >
                  <ChevronRight className="h-4 w-4" />
                  הקודם
                </Button>
              ) : (
                <div></div>
              )}
              
              {currentStep < steps.length - 1 ? (
                <Button 
                  type="button"
                  onClick={() => {
                    setDirection(1);
                    nextStep();
                  }}
                  className="gap-2 bg-primary"
                >
                  הבא
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : currentStep === steps.length - 1 ? (
                <Button 
                  type="button"
                  onClick={() => {
                    setDirection(1);
                    nextStep();
                  }}
                  className="gap-2 bg-primary"
                >
                  סיום
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              ) : (
                <Button 
                  type="submit"
                  disabled={isSubmitting}
                  className="gap-2 bg-green-600 hover:bg-green-700"
                >
                  {isSubmitting ? 'שולח...' : 'שלח את השאלון'}
                  <Send className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default ModernTraderQuestionnaire;
