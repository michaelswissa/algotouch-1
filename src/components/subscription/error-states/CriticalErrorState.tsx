
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SubscriptionCard from '../SubscriptionCard';
import SubscriptionManager from '../payment/SubscriptionManager';

export interface ErrorStateProps {
  title: string;
  description: string;
  onRefresh: () => Promise<void>;
  userId?: string;
  email?: string;
  children?: React.ReactNode;
}

export const CriticalErrorState: React.FC<ErrorStateProps> = ({ 
  title, 
  description, 
  onRefresh, 
  userId, 
  email 
}) => {
  const navigate = useNavigate();
  
  return (
    <SubscriptionCard 
      title={title} 
      description={description}
    >
      <div className="p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            קיימת בעיה בטעינת פרטי המנוי. ייתכן שהנתונים בבסיס הנתונים חסרים או שגויים.
          </AlertDescription>
        </Alert>
        
        <div className="flex gap-4 justify-center">
          <Button 
            onClick={onRefresh}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            נסה שוב
          </Button>
          
          <Button 
            variant="outline"
            onClick={() => navigate('/subscription')}
          >
            עבור לדף המנויים
          </Button>
        </div>
        
        {userId && email && (
          <div className="mt-6 p-4 border border-yellow-500 bg-yellow-50 rounded-md">
            <h3 className="font-medium mb-2">כלי תיקון:</h3>
            <p className="mb-4 text-sm">לתיקון בעיות במנוי, ניתן להשתמש בכלי התיקון:</p>
            <SubscriptionManager 
              userId={userId} 
              email={email} 
              onComplete={onRefresh}
            />
          </div>
        )}
      </div>
    </SubscriptionCard>
  );
};

export default CriticalErrorState;
