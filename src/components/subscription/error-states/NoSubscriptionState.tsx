
import React from 'react';
import { Button } from '@/components/ui/button';
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
      <div className="text-center py-6">
        <Button 
          onClick={onSubscribe}
          className="mx-auto"
        >
          בחר תכנית מנוי
        </Button>
      </div>
    </SubscriptionCard>
  );
};

export default NoSubscriptionState;
