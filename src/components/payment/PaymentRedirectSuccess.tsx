
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PaymentRedirectSuccessProps {
  paymentDetails: any;
}

export const PaymentRedirectSuccess: React.FC<PaymentRedirectSuccessProps> = ({ paymentDetails }) => {
  const navigate = useNavigate();

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>התשלום התקבל בהצלחה!</CardTitle>
          <CardDescription>תודה על הצטרפותך</CardDescription>
        </CardHeader>
        <CardContent>
          <p>פרטי העסקה נשמרו במערכת.</p>
          {paymentDetails && (
            <div className="mt-2 text-sm text-muted-foreground">
              <p>מקור האימות: {paymentDetails.source}</p>
              {paymentDetails.details?.TranzactionId && (
                <p>מזהה עסקה: {paymentDetails.details.TranzactionId}</p>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/dashboard')} className="w-full">
            המשך לדף הבית
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};
