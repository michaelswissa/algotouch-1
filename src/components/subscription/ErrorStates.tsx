import React from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SubscriptionCard from './SubscriptionCard';
import SubscriptionManager from '../payment/SubscriptionManager';
import { AlertTriangle } from 'lucide-react';

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

export const NoSubscriptionState: React.FC<{onSubscribe: () => void}> = ({ onSubscribe }) => {
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
