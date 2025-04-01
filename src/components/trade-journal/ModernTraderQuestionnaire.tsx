
import React, { useState } from 'react';
import QuestionnaireForm from './questionnaire/QuestionnaireForm';
import { FormattedData } from './questionnaire/schema';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { motion } from 'framer-motion';

interface ModernTraderQuestionnaireProps {
  onSubmit: (data: FormattedData) => void;
  isLoading?: boolean;
}

const ModernTraderQuestionnaire: React.FC<ModernTraderQuestionnaireProps> = ({ 
  onSubmit,
  isLoading = false 
}) => {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (data: FormattedData) => {
    try {
      setError(null);
      
      // Validate essential fields
      if (!data.emotional.state) {
        throw new Error('נא לבחור את מצב הרגשי שלך');
      }
      
      // Pass the data to the parent component
      await onSubmit(data);
      
      // Show success toast
      toast({
        title: "השאלון נשלח בהצלחה",
        description: "הדוח היומי שלך נוצר ונשמר",
        duration: 3000,
      });
    } catch (err) {
      console.error('Error submitting questionnaire:', err);
      setError(err instanceof Error ? err.message : 'אירעה שגיאה בשליחת השאלון');
      
      toast({
        variant: "destructive",
        title: "שגיאה בשליחת השאלון",
        description: err instanceof Error ? err.message : 'אירעה שגיאה בשליחת השאלון',
        duration: 5000,
      });
    }
  };

  // If there's an error, show an alert
  if (error) {
    return (
      <motion.div 
        className="w-full max-w-4xl mx-auto"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-5 w-5 ml-3" />
          <AlertTitle>שגיאה בשליחת השאלון</AlertTitle>
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => setError(null)}
          variant="outline"
          className="w-full"
        >
          נסה שוב
        </Button>
      </motion.div>
    );
  }

  // If the form is loading, show a loading state
  if (isLoading) {
    return (
      <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[400px] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h3 className="text-xl font-medium mb-2">טוען את השאלון...</h3>
        <p className="text-muted-foreground">אנא המתן, הנתונים מתעדכנים</p>
      </div>
    );
  }

  return (
    <motion.div 
      className="w-full max-w-4xl mx-auto"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <QuestionnaireForm onSubmit={handleSubmit} />
    </motion.div>
  );
};

export default ModernTraderQuestionnaire;
