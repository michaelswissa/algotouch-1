
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formSchema, FormValues, QuestionnaireFormProps } from './schema';
import { formatQuestionnaireData } from './utils';
import { fieldsToValidateByStep } from './stepsConfig';

export const useQuestionnaireForm = ({ onSubmit }: QuestionnaireFormProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [direction, setDirection] = useState(0);

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

  const nextStep = async () => {
    const isStepValid = await trigger(fieldsToValidateByStep[currentStep] as any);
    
    if (isStepValid) {
      setDirection(1);
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    setDirection(-1);
    setCurrentStep(currentStep - 1);
  };

  const onFormSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    // Format the data for the report
    const formattedData = formatQuestionnaireData(data);
    
    // Submit the data
    onSubmit(formattedData);
    setIsSubmitting(false);
  };

  return {
    currentStep,
    direction,
    isSubmitting,
    formMethods: {
      register,
      handleSubmit,
      watch,
      setValue,
      errors
    },
    navigation: {
      nextStep,
      prevStep,
      onFormSubmit
    }
  };
};
