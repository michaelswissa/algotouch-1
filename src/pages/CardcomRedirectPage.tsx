
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LoadingPage } from '@/components/ui/spinner';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PaymentRedirectError } from '@/components/payment/PaymentRedirectError';
import { PaymentRedirectSuccess } from '@/components/payment/PaymentRedirectSuccess';
import { usePaymentVerification } from '@/features/payment/hooks/usePaymentVerification';

export default function CardcomRedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [parseFailed, setParseFailed] = useState(false);

  // Parse URL search params to get relevant data safely
  let lowProfileId: string | null = null;
  try {
    const searchParams = new URLSearchParams(location.search);
    lowProfileId = searchParams.get('LowProfileId');
    
    // Also check for lowercase variant which might come from some redirects
    if (!lowProfileId) {
      lowProfileId = searchParams.get('lowProfileId');
    }
    
    // Check for success/failure indicators
    const success = searchParams.get('success');
    const error = searchParams.get('error');
    const errorMessage = searchParams.get('message');
    
    // If we have error=true in the URL, show error immediately
    if (error === 'true' && errorMessage) {
      return (
        <PaymentRedirectError 
          error={decodeURIComponent(errorMessage)} 
        />
      );
    }
  } catch (error) {
    console.error('Error parsing URL parameters:', error);
    setParseFailed(true);
  }
  
  // Use our custom hook to handle payment verification - only if we have a lowProfileId
  const { isLoading, error, paymentDetails } = usePaymentVerification({ 
    lowProfileId,
    skipVerification: !lowProfileId,
    redirectOnSuccess: false // We'll handle redirection here
  });

  // Render appropriate UI based on state
  if (parseFailed) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>שגיאה בעיבוד נתונים</CardTitle>
          <CardDescription>לא ניתן לעבד את פרמטרי הכתובת</CardDescription>
        </CardHeader>
        <CardContent>
          <p>אירעה שגיאה בעיבוד נתוני התשלום. בדוק את הכתובת או נסה שנית.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/subscription')} className="w-full">
            חזרה לדף התשלום
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (!lowProfileId) {
    return (
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>חסרים פרטי תשלום</CardTitle>
          <CardDescription>לא נמצא מזהה תשלום בכתובת</CardDescription>
        </CardHeader>
        <CardContent>
          <p>לא התקבל מזהה תשלום מהשרת. יתכן שקישור ההפניה שגוי או חסרים פרמטרים.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/subscription')} className="w-full">
            חזרה לדף התשלום
          </Button>
        </CardFooter>
      </Card>
    );
  }

  if (isLoading) {
    return <LoadingPage message="מאמת פרטי תשלום..." />;
  }

  if (error) {
    return <PaymentRedirectError error={error} />;
  }

  return <PaymentRedirectSuccess paymentDetails={paymentDetails} />;
}
