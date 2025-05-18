
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import SubscriptionCard from '../SubscriptionCard';
import { ErrorStateProps } from './CriticalErrorState';

export const TimeoutWarningState: React.FC<ErrorStateProps> = ({ 
  title, 
  description, 
  onRefresh 
}) => {
  return (
    <SubscriptionCard 
      title={title} 
      description={description}
    >
      <div className="p-6">
        <Alert className="mb-4">
          <AlertDescription>
            טעינת פרטי המנוי נמשכת זמן רב מהצפוי. ייתכן שישנה בעיה בתקשורת עם השרת.
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={onRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            רענן נתונים
          </Button>
        </div>
        
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <p>אם הבעיה נמשכת, ייתכן שנתוני המנוי חסרים במערכת.</p>
        </div>
      </div>
    </SubscriptionCard>
  );
};

export default TimeoutWarningState;
