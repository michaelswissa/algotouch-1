
import React from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import SubscriptionCard from '../SubscriptionCard';

interface NoSubscriptionStateProps {
  onSubscribe: () => void;
}

export const NoSubscriptionState: React.FC<NoSubscriptionStateProps> = ({ onSubscribe }) => {
  return (
    <SubscriptionCard 
      title="אין לך מנוי פעיל" 
      description="הרשם עכשיו כדי לקבל גישה מלאה למערכת"
    >
      <div className="p-6">
        <Alert className="mb-6 border-dashed">
          <AlertDescription className="text-sm">
            אם אתה רואה את זה ויש לך מנוי פעיל, לחץ על 'תקן נתוני מנוי' למטה כדי לתקן אוטומטית. אם זה נכשל, צור קשר עם התמיכה.
          </AlertDescription>
        </Alert>
        
        <div className="text-center">
          <Button 
            onClick={onSubscribe}
            className="mx-auto"
          >
            בחר תכנית מנוי
          </Button>
        </div>
      </div>
    </SubscriptionCard>
  );
};

export default NoSubscriptionState;
