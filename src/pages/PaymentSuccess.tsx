
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId');
  const amount = searchParams.get('amount');

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center h-[70vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex flex-col items-center gap-2">
              <CheckCircle className="h-12 w-12 text-green-500" />
              <CardTitle className="text-center">התשלום בוצע בהצלחה</CardTitle>
              <CardDescription className="text-center">
                התשלום שלך עבור {amount ? `${amount} ₪` : 'ההזמנה'} בוצע בהצלחה
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="text-center">
            {transactionId && (
              <p className="text-muted-foreground text-sm">
                מספר עסקה: {transactionId}
              </p>
            )}
            <p className="mt-4">
              תודה על הרכישה! אישור על העסקה נשלח לכתובת הדואר האלקטרוני שלך.
            </p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={handleBackToDashboard}>חזרה לדף הבית</Button>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default PaymentSuccess;
