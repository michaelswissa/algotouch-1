
import React from 'react';
import SubscriptionCard from '../SubscriptionCard';
import SubscriptionManager from '../payment/SubscriptionManager';

export interface UnprocessedPaymentStateProps {
  userId: string;
  email: string;
  lowProfileId?: string;
  onComplete: () => Promise<void>;
}

export const UnprocessedPaymentState: React.FC<UnprocessedPaymentStateProps> = ({ 
  userId, 
  email, 
  lowProfileId, 
  onComplete 
}) => {
  return (
    <SubscriptionCard 
      title="עדכון פרטי מנוי" 
      description="נראה שביצעת תשלום שלא הושלם לגמרי במערכת"
    >
      <SubscriptionManager 
        userId={userId} 
        email={email} 
        lowProfileId={lowProfileId || undefined} 
        onComplete={onComplete}
      />
    </SubscriptionCard>
  );
};

export default UnprocessedPaymentState;
