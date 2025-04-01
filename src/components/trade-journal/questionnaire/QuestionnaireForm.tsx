
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import StepIndicator from './StepIndicator';
import StepNavigation from './StepNavigation';
import StepContent from './StepContent';
import { useQuestionnaireForm } from './useQuestionnaireForm';
import { QuestionnaireFormProps } from './schema';
import { questionnaireSteps } from './stepsConfig';

const QuestionnaireForm: React.FC<QuestionnaireFormProps> = ({ onSubmit }) => {
  const {
    currentStep,
    direction,
    isSubmitting,
    formMethods: { handleSubmit, watch, setValue, errors },
    navigation: { nextStep, prevStep, onFormSubmit }
  } = useQuestionnaireForm({ onSubmit });

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} dir="rtl" className="questionnaire-container">
      <Card className="overflow-hidden shadow-lg border-primary/20 bg-gradient-to-br from-card/90 to-card hover:shadow-xl transition-all duration-500">
        <CardHeader className="relative pb-2 bg-primary/5">
          <CardTitle className="text-2xl text-center font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/70">
            🚀 שאלון סוחר יומי – AlgoTouch
          </CardTitle>
          
          <StepIndicator steps={questionnaireSteps} currentStep={currentStep} />
        </CardHeader>
        
        <CardContent className="p-6">
          <StepContent
            currentStep={currentStep}
            direction={direction}
            watch={watch}
            setValue={setValue}
            errors={errors}
          />
        </CardContent>
        
        <CardFooter className="p-6 border-t border-border/30 bg-muted/20">
          <StepNavigation 
            currentStep={currentStep}
            stepsCount={questionnaireSteps.length + 1}
            onNext={nextStep}
            onPrev={prevStep}
            onSubmit={handleSubmit(onFormSubmit)}
            isSubmitting={isSubmitting}
            isLastStep={currentStep === questionnaireSteps.length}
          />
        </CardFooter>
      </Card>
    </form>
  );
};

export default QuestionnaireForm;
