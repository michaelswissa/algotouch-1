
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ManualWebhookProcessor: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  // The specific webhook ID and email we want to process
  const webhookId = '4fcd18c4-9719-49a0-b70c-841f1e0e4686';
  const userEmail = 'michael4suissa@gmail.com';
  
  const handleProcessWebhook = async () => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    
    try {
      // First, find the user ID for this email
      const { data: userData, error: userError } = await supabase.auth
        .admin.listUsers({
          filters: [
            {
              property: 'email',
              operator: 'eq',
              value: userEmail
            }
          ]
        });
      
      if (userError || !userData?.users?.length) {
        throw new Error('Could not find user with email: ' + userEmail);
      }
      
      const userId = userData.users[0].id;
      console.log('Found user ID:', userId);
      
      // Call the process-webhook function with webhook ID
      const { data, error } = await supabase.functions.invoke('process-webhook', {
        body: {
          webhookId,
          userId,
          email: userEmail
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      setResult(data);
      
      if (data.success) {
        toast.success('Webhook processed successfully!');
        
        // Refresh subscription data from database
        await refreshSubscription(userId);
      } else {
        toast.error('Failed to process webhook: ' + (data.message || 'Unknown error'));
      }
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      setError(err.message || 'An unexpected error occurred');
      toast.error('Error: ' + (err.message || 'An unexpected error occurred'));
    } finally {
      setIsProcessing(false);
    }
  };
  
  const refreshSubscription = async (userId: string) => {
    try {
      // Fetch the updated subscription data
      const { data: subscription, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        console.error('Error fetching updated subscription:', error);
        return;
      }
      
      // Fetch the token data
      const { data: token } = await supabase
        .from('recurring_payments')
        .select('*')
        .eq('user_id', userId)
        .eq('is_valid', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      setResult(prev => ({
        ...prev,
        updatedSubscription: subscription,
        token
      }));
      
      console.log('Updated subscription data:', subscription);
      console.log('Token data:', token);
    } catch (err) {
      console.error('Error refreshing subscription data:', err);
    }
  };
  
  return (
    <Card className="w-full max-w-lg mx-auto mt-6">
      <CardHeader>
        <CardTitle>מעבד תשלום ידני</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="mb-2"><strong>משתמש:</strong> {userEmail}</p>
          <p><strong>מזהה Webhook:</strong> {webhookId}</p>
        </div>
        
        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className="mt-4">
            <div className="flex items-center gap-2">
              {result.success ? 
                <CheckCircle className="h-4 w-4 text-green-500" /> : 
                <XCircle className="h-4 w-4 text-red-500" />
              }
              <span>{result.success ? 'הצליח' : 'נכשל'}</span>
            </div>
            <AlertDescription className="mt-2">
              {result.message || (result.success ? 'התהליך הושלם בהצלחה' : 'שגיאה בתהליך')}
              
              {result.updatedSubscription && (
                <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                  <p><strong>סטטוס מנוי:</strong> {result.updatedSubscription.status}</p>
                  <p><strong>סוג מנוי:</strong> {result.updatedSubscription.plan_type}</p>
                  <p><strong>תאריך חיוב הבא:</strong> {new Date(result.updatedSubscription.current_period_ends_at).toLocaleDateString('he-IL')}</p>
                </div>
              )}
              
              {result.token && (
                <div className="mt-2 p-2 bg-muted rounded-md text-sm">
                  <p><strong>טוקן נוצר:</strong> {result.token.token.substring(0, 6)}...{result.token.token.substring(result.token.token.length - 4)}</p>
                  <p><strong>תוקף טוקן:</strong> {result.token.token_expiry}</p>
                  <p><strong>מס׳ אישור:</strong> {result.token.token_approval_number}</p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleProcessWebhook} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> מעבד...</>
          ) : 'עבד webhook ידנית'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default ManualWebhookProcessor;
