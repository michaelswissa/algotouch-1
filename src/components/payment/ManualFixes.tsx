
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logPaymentError } from '@/features/payment/utils/errorHandling';

interface ManualFixesProps {
  userId: string;
}

const ManualFixes: React.FC<ManualFixesProps> = ({ userId }) => {
  const [lowProfileId, setLowProfileId] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleFix = async () => {
    if (!lowProfileId) {
      toast.error('נא להזין מזהה עסקה (LowProfileId)');
      return;
    }

    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-webhook', {
        body: {
          lowProfileId,
          userId
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setResult(data);
      if (data.success) {
        toast.success('הטוקן ורשומת המנוי נוצרו בהצלחה!');
      } else {
        toast.error(data.message || 'שגיאה בעיבוד התשלום');
      }
    } catch (error: any) {
      console.error('Error fixing payment:', error);
      
      // Use our error handling service - fix typing by passing error as string
      logPaymentError(
        error, 
        userId, 
        'manual_fix', 
        { // Pass as additional data instead
          lowProfileId,
          operation: 'manual_fix'
        }
      );
      
      toast.error(error.message || 'שגיאה בתהליך התיקון');
      setResult({ success: false, message: error.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>תיקון ידני של תשלום</CardTitle>
        <CardDescription>שחזור טוקן ומנוי למשתמש קיים</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="lowProfileId" className="text-sm font-medium">
            מזהה עסקה (LowProfileId)
          </label>
          <Input
            id="lowProfileId"
            value={lowProfileId}
            onChange={(e) => setLowProfileId(e.target.value)}
            placeholder="הזן את מזהה העסקה מ-CardCom"
            disabled={isProcessing}
          />
        </div>

        {result && (
          <Alert variant={result.success ? "default" : "destructive"}>
            {result.success ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <AlertTitle>{result.success ? 'תהליך הושלם בהצלחה' : 'שגיאה'}</AlertTitle>
            <AlertDescription>
              {result.message}
              {result.success && (
                <div className="mt-2 space-y-1">
                  <Badge variant="outline" className="mr-2">
                    {result.subscriptionUpdated !== false ? 'מנוי עודכן ✓' : 'שגיאה בעדכון מנוי ✗'}
                  </Badge>
                  <Badge variant="outline" className="mr-2">
                    {result.tokenSaved !== false ? 'טוקן נשמר ✓' : 'שגיאה בשמירת טוקן ✗'}
                  </Badge>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleFix} disabled={isProcessing || !lowProfileId} className="w-full">
          {isProcessing ? 'מעבד...' : 'תקן תשלום'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ManualFixes;
