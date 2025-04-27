
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

const SuccriptionSuccess = () => {
  const navigate = useNavigate();

  return (
    <Card className="max-w-lg mx-auto text-center">
      <CardHeader>
        <div className="flex justify-center mb-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
        </div>
        <CardTitle className="text-2xl">המנוי הופעל בהצלחה!</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-6">
          אנו שמחים לבשר לך שהמנוי שלך הופעל בהצלחה. כעת יש לך גישה מלאה לכל התכונות והכלים.
        </p>
        <p className="text-muted-foreground">
          תוכל לצפות בפרטי המנוי ובתשלומים בכל עת באזור האישי.
        </p>
      </CardContent>
      <CardFooter className="flex flex-col space-y-2">
        <Button className="w-full" onClick={() => navigate('/dashboard')}>
          למעבר למערכת
        </Button>
        <Button variant="outline" className="w-full" onClick={() => navigate('/my-subscription')}>
          לפרטי המנוי שלי
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SuccriptionSuccess;
