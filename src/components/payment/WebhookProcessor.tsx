
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const WebhookProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRunResult, setLastRunResult] = useState<any>(null);
  const [showResults, setShowResults] = useState(false);

  const processUnprocessedWebhooks = async () => {
    try {
      setIsProcessing(true);
      setShowResults(false);

      const { data, error } = await supabase.functions.invoke('process-unprocessed-webhooks', {
        body: {
          maxRetries: 3,
          ageInHours: 48,
          limit: 50
        }
      });

      if (error) {
        console.error('Error processing webhooks:', error);
        toast.error(`Error processing webhooks: ${error.message}`);
        setLastRunResult({ success: false, error: error.message });
        return;
      }

      setLastRunResult(data);
      setShowResults(true);
      
      if (data.success) {
        const { results } = data;
        const successful = results?.filter((r: any) => r.success).length || 0;
        const total = results?.length || 0;
        
        if (total === 0) {
          toast.info('No unprocessed webhooks found');
        } else {
          toast.success(`Processed ${total} webhooks: ${successful} successful, ${total - successful} failed`);
        }
      } else {
        toast.error(data.message || 'Failed to process webhooks');
      }
    } catch (error) {
      console.error('Error invoking function:', error);
      toast.error('An unexpected error occurred');
      setLastRunResult({ success: false, error: String(error) });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>אוטומציה לעיבוד Webhooks</CardTitle>
        <CardDescription>
          כלי זה מעבד באופן אוטומטי webhooks שלא עובדו עדיין, ומנסה למפות אותם למשתמשים לפי כתובת דוא"ל אם צריך
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            לחץ על הכפתור למטה לתחיל בעיבוד ידני של webhooks שלא עובדו. 
            המערכת גם מריצה תהליך זה אוטומטית כל שעה.
          </p>
          
          <Button 
            onClick={processUnprocessedWebhooks} 
            disabled={isProcessing}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                מעבד...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                עבד webhooks שלא טופלו
              </>
            )}
          </Button>
          
          {lastRunResult && (
            <div className="mt-4">
              <div className={`p-3 rounded-md flex items-center gap-2 ${
                lastRunResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
              }`}>
                {lastRunResult.success ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <AlertCircle className="h-5 w-5" />
                )}
                <span className="text-sm">
                  {lastRunResult.success 
                    ? lastRunResult.message || 'הריצה הצליחה'
                    : lastRunResult.error || 'אירעה שגיאה בעיבוד'
                  }
                </span>
              </div>
              
              {showResults && lastRunResult.results && (
                <Button 
                  variant="link"
                  className="mt-2 px-0"
                  onClick={() => setShowResults(prev => !prev)}
                >
                  {showResults ? 'הסתר תוצאות מפורטות' : 'הצג תוצאות מפורטות'}
                </Button>
              )}
              
              {showResults && lastRunResult.results && (
                <div className="mt-2 max-h-60 overflow-y-auto border rounded-md">
                  <pre className="p-3 text-xs whitespace-pre-wrap">
                    {JSON.stringify(lastRunResult.results, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="flex flex-col items-start border-t pt-4">
        <p className="text-xs text-muted-foreground">
          תהליך אוטומטי מריץ פונקציה זו כל שעה. אם יש משתמשים שהתשלום שלהם לא עובד, תוכל להשתמש בכלי זה כדי לנסות לתקן את המצב באופן גורף.
        </p>
      </CardFooter>
    </Card>
  );
};

export default WebhookProcessor;
