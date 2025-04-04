
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

const PaymentFailure: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('errorCode');
  const errorMessage = searchParams.get('errorMessage');

  const handleTryAgain = () => {
    navigate('/subscription');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="container max-w-md py-12">
      <Card className="border-red-200 shadow-md">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-16 w-16 text-red-500" />
          </div>
          <CardTitle className="text-2xl text-red-700">התשלום נכשל</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-6">
            לצערנו, התשלום לא הושלם בהצלחה. אנא נסה שוב או צור קשר עם התמיכה.
          </p>
          
          {(errorCode || errorMessage) && (
            <div className="bg-red-50 p-3 rounded-md mb-6 text-sm text-red-800">
              {errorCode && <p>קוד שגיאה: {errorCode}</p>}
              {errorMessage && <p>פרטי השגיאה: {errorMessage}</p>}
            </div>
          )}
          
          <div className="space-y-3">
            <Button 
              variant="default" 
              className="w-full"
              onClick={handleTryAgain}
            >
              נסה שוב
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleGoHome}
            >
              חזרה לדף הבית
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailure;
