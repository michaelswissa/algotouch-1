
import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/auth';

const PaymentSuccess: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');

  useEffect(() => {
    // If user is not logged in, redirect to login
    if (!user) {
      navigate('/auth', { replace: true });
    }
  }, [user, navigate]);

  const handleGoDashboard = () => {
    navigate('/dashboard');
  };

  const handleGoSubscription = () => {
    navigate('/subscription');
  };

  return (
    <div className="container max-w-md py-12">
      <Card className="border-green-200 shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
          <CardTitle className="text-2xl text-green-700">התשלום בוצע בהצלחה!</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            תודה על הרכישה. המנוי שלך פעיל כעת וניתן להתחיל להשתמש בכל תכונות המערכת.
          </p>
          
          {orderId && (
            <p className="text-sm text-muted-foreground mb-6 font-mono">
              מספר הזמנה: {orderId}
            </p>
          )}
          
          <div className="space-y-3">
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleGoDashboard}
            >
              מעבר לדשבורד
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleGoSubscription}
            >
              פרטי המנוי שלי
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
