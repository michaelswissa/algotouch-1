
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar } from 'lucide-react';

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
  return (
    <div className="space-y-4">
      {status === 'trial' && (
        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 mt-0.5" />
            <div>
              <h3 className="font-medium text-purple-700 dark:text-purple-300">תקופת ניסיון פעילה</h3>
              <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">
                נותרו {daysLeft} ימים לסיום תקופת הניסיון שלך
              </p>
              <Progress 
                value={progressValue} 
                className="h-2 mt-3 bg-purple-100 dark:bg-purple-900" 
              />
              <div className="flex justify-between text-xs text-purple-500 dark:text-purple-400 mt-1">
                <span>התחלה</span>
                <span>סיום תקופת הניסיון</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {status !== 'trial' && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <h3 className="font-medium text-green-700 dark:text-green-300">
                {status === 'active' ? 'מנוי פעיל' : 'מנוי מבוטל'}
              </h3>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                {status === 'active' ? 'המנוי שלך פעיל ומחודש אוטומטית' : 'המנוי שלך יסתיים בתאריך החיוב הבא'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatus;
