
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface PaymentErrorCardProps {
  errorMessage: string;
}

const PaymentErrorCard: React.FC<PaymentErrorCardProps> = ({ errorMessage }) => {
  const navigate = useNavigate();
  
  return (
    <Card className="max-w-lg mx-auto" dir="rtl">
      <CardHeader>
        <CardTitle>שגיאה בתהליך ההרשמה</CardTitle>
        <CardDescription>חסרים פרטי התחברות או שאירעה שגיאה בעיבוד הפרטים</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        
        <div className="mt-4 space-y-4">
          <p className="text-center text-muted-foreground">אנא בחר אחת מהאפשרויות הבאות:</p>
          
          <div className="flex flex-col space-y-2">
            <Button 
              onClick={() => navigate('/auth?tab=signup', { state: { redirectToSubscription: true } })}
              variant="default"
            >
              חזור להרשמה
            </Button>
            
            <Button 
              onClick={() => navigate('/auth', { replace: true })}
              variant="outline"
            >
              התחבר עם חשבון קיים
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentErrorCard;
