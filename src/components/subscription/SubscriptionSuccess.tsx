
import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SubscriptionSuccess: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="max-w-md mx-auto bg-green-50 dark:bg-green-900/20 text-center p-8 rounded-xl border border-green-200 dark:border-green-800">
      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center mb-4">
        <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
      </div>
      <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">
        הרשמה הושלמה בהצלחה!
      </h2>
      <p className="text-green-700 dark:text-green-300 mb-6">
        ברכות! נרשמת בהצלחה לתקופת ניסיון חינם. כעת יש לך גישה מלאה למערכת.
      </p>
      <Button onClick={() => navigate('/dashboard', { replace: true })} className="gap-2">
        המשך לדף הבית <ChevronRight className="h-4 w-4 -rotate-180" />
      </Button>
    </div>
  );
};

export default SubscriptionSuccess;
