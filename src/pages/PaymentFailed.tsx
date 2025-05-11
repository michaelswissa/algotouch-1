
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

const PaymentFailed = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get('errorCode');
  const errorMessage = searchParams.get('errorMessage');

  const handleRetry = () => {
    navigate(-2); // Go back to the payment initiation page
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex flex-col items-center gap-2">
              <AlertCircle className="h-12 w-12 text-red-500" />
              <CardTitle className="text-center">העסקה נכשלה</CardTitle>
              <CardDescription className="text-center">
                לא הצלחנו להשלים את עיבוד התשלום שלך
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            {errorMessage && (
              <p className="text-red-500 mb-4">{errorMessage}</p>
            )}
            {errorCode && (
              <p className="text-muted-foreground text-sm">
                קוד שגיאה: {errorCode}
              </p>
            )}
            <p className="mt-4">
              אנא נסו שנית או בחרו באמצעי תשלום אחר
            </p>
          </CardContent>
          <CardFooter className="flex justify-center gap-4">
            <Button onClick={handleRetry} variant="default">
              נסה שוב
            </Button>
            <Button onClick={handleBackToDashboard} variant="outline">
              חזרה לדף הבית
            </Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentFailed;
