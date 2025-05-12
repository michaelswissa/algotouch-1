
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface PaymentRedirectErrorProps {
  error: string;
}

export const PaymentRedirectError: React.FC<PaymentRedirectErrorProps> = ({ error }) => {
  const navigate = useNavigate();

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
};
