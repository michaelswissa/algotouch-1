
import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SubscriptionCard from '../SubscriptionCard';
import SubscriptionManager from '../payment/SubscriptionManager';
import { ErrorStateProps } from './CriticalErrorState';

export const MaxRetriesState: React.FC<ErrorStateProps> = ({ 
  title, 
  description, 
  onRefresh, 
  userId, 
  email,
  children 
}) => {
  const navigate = useNavigate();
  
  return (
    <SubscriptionCard 
      title={title} 
      description={description}
    >
      <div className="p-6">
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            {children || 'לא ניתן לטעון את פרטי המנוי לאחר מספר ניסיונות'}
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
        
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>אם הבעיה נמשכת, אנא נסה להתחבר מחדש או צור קשר עם התמיכה</p>
          
          {userId && email && (
            <div className="mt-4">
              <SubscriptionManager 
                userId={userId} 
                email={email} 
                onComplete={onRefresh}
              />
            </div>
          )}
        </div>
      </div>
    </SubscriptionCard>
  );
};

export default MaxRetriesState;
