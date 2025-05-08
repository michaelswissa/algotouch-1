
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { LoadingPage } from '@/components/ui/spinner';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export default function CardcomRedirectPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function handleRedirect() {
      try {
        // Parse URL search params to get relevant data
        const searchParams = new URLSearchParams(location.search);
        const lowProfileId = searchParams.get('LowProfileId');
        
        if (!lowProfileId) {
          setError('לא התקבלו נתונים מספיקים מהשרת');
          setIsLoading(false);
          return;
        }

        // Call Supabase function to verify payment
        const { data, error: functionError } = await supabase.functions.invoke('verify-cardcom-payment', {
          body: { lowProfileId }
        });

        if (functionError) {
          throw new Error(functionError.message);
        }

        if (data?.success) {
          toast.success('התשלום התקבל בהצלחה!');
          // Navigate to success page or dashboard
          navigate('/my-subscription');
        } else {
          setError(data?.message || 'אירעה שגיאה בתהליך אימות התשלום');
        }
      } catch (err: any) {
        console.error('Error processing redirect:', err);
        setError('אירעה שגיאה בעת עיבוד נתוני התשלום');
      } finally {
        setIsLoading(false);
      }
    }

    handleRedirect();
  }, [location, navigate]);

  if (isLoading) {
    return <LoadingPage />;
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>שגיאה בתהליך התשלום</CardTitle>
            <CardDescription>לא ניתן היה לאמת את התשלום</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-destructive">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button variant="outline" onClick={() => navigate('/subscription')}>חזרה לדף התשלום</Button>
            <Button onClick={() => navigate('/dashboard')}>חזרה לדף הבית</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>התשלום התקבל בהצלחה!</CardTitle>
          <CardDescription>תודה על הצטרפותך</CardDescription>
        </CardHeader>
        <CardContent>
          <p>פרטי העסקה נשמרו במערכת.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/my-subscription')} className="w-full">
            צפייה במנוי שלי
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
