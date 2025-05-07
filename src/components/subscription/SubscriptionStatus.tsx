
import React from 'react';
import { Progress } from '@/components/ui/progress';

interface SubscriptionStatusProps {
  status: string;
  daysLeft: number;
  progressValue: number;
}

const SubscriptionStatus: React.FC<SubscriptionStatusProps> = ({ 
  status, 
  daysLeft, 
  progressValue 
}) => {
  if (status !== 'trial') return null;
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>תקופת ניסיון</span>
        <span className="font-medium">{daysLeft} ימים נותרו</span>
      </div>
      <Progress value={progressValue} className="h-2" />
    </div>
  );
};

export default SubscriptionStatus;
