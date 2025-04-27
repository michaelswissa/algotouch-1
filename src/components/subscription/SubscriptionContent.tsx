
import React from 'react';
import SubscriptionStepHandler from '@/components/subscription/SubscriptionStepHandler';

const SubscriptionContent: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto px-4" dir="rtl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">השלמת תהליך ההרשמה</h1>
        <p className="text-muted-foreground">יש להשלים את השלבים הבאים לקבלת גישה למערכת</p>
      </div>
      
      <SubscriptionStepHandler />
    </div>
  );
};

export default SubscriptionContent;
