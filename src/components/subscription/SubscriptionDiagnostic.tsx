
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface DiagnosticResult {
  hasSubscription: boolean;
  hasRecurringPayment: boolean;
  hasWebhooks: boolean;
  subscriptionData?: any;
  tokenData?: any;
  webhookData?: any;
}

const SubscriptionDiagnostic: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [diagnosing, setDiagnosing] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [diagnosticResult, setDiagnosticResult] = useState<DiagnosticResult | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Run diagnostic when component mounts
  useEffect(() => {
    if (user?.id) {
      runDiagnostic();
    }
  }, [user]);

  // Function to run diagnostic tests
  const runDiagnostic = async () => {
    if (!user?.id) return;
    
    try {
      setDiagnosing(true);
      
      // Check if subscription exists
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
        
      // Check if recurring payment token exists
      const { data: tokenData } = await supabase
        .from('recurring_payments')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_valid', true)
        .order('created_at', { ascending: false })
        .limit(1);
        
      // Check if webhook data exists
      const { data: webhookData } = await supabase
        .from('payment_webhooks')
        .select('*')
        .eq('processed', false)
        .order('created_at', { ascending: false })
        .limit(5);

      let filteredWebhooks = [];
      
      // Find webhooks that might be related to this user
      if (webhookData && webhookData.length > 0 && user.email) {
        filteredWebhooks = webhookData.filter(webhook => {
          if (!webhook.payload) return false;
          
          // Check if webhook payload contains user email
          const payload = webhook.payload;
          const hasEmail = 
            payload.UIValues?.CardOwnerEmail?.toLowerCase().includes(user.email.toLowerCase()) ||
            payload.TranzactionInfo?.CardOwnerEmail?.toLowerCase().includes(user.email.toLowerCase());
            
          return hasEmail;
        });
      }
      
      // Set diagnostic results
      setDiagnosticResult({
        hasSubscription: !!subscriptionData,
        hasRecurringPayment: tokenData && tokenData.length > 0,
        hasWebhooks: filteredWebhooks.length > 0,
        subscriptionData,
        tokenData: tokenData && tokenData.length > 0 ? tokenData[0] : null,
        webhookData: filteredWebhooks
      });
      
    } catch (error) {
      console.error('Error running diagnostic:', error);
      toast.error('שגיאה בבדיקת נתוני המנוי');
    } finally {
      setDiagnosing(false);
      setLoading(false);
    }
  };

  // Function to repair subscription data
  const repairSubscription = async () => {
    if (!user?.id || !user?.email) {
      toast.error('פרטי משתמש חסרים');
      return;
    }
    
    try {
      setRepairing(true);
      toast.info('מתקן את נתוני המנוי...');
      
      // Call the reprocess-webhook-by-email function
      const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
        body: { 
          email: user.email,
          userId: user.id,
          forceRefresh: true
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('נתוני המנוי עודכנו בהצלחה');
        // Run diagnostic again to verify repair
        await runDiagnostic();
        // Reload page after short delay
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        toast.warning(data?.message || 'לא נמצאו נתוני תשלום לתיקון');
      }
    } catch (error) {
      console.error('Error repairing subscription:', error);
      toast.error('שגיאה בתיקון נתוני המנוי');
    } finally {
      setRepairing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        <span>בודק נתוני מנוי...</span>
      </div>
    );
  }

  // If everything is fine, don't show anything
  if (diagnosticResult?.hasSubscription && diagnosticResult?.hasRecurringPayment) {
    return null;
  }

  return (
    <Card className="my-4 border-amber-500 dark:border-amber-700">
      <CardHeader>
        <CardTitle className="flex items-center text-amber-600 dark:text-amber-400">
          <RefreshCw className="h-5 w-5 mr-2" />
          אבחון נתוני מנוי
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!diagnosticResult?.hasSubscription && (
          <Alert variant="warning" className="mb-4">
            <AlertDescription>
              לא נמצא רישום מנוי במערכת. יתכן שתהליך התשלום לא הושלם במלואו.
            </AlertDescription>
          </Alert>
        )}
        
        {!diagnosticResult?.hasRecurringPayment && diagnosticResult?.hasSubscription && (
          <Alert variant="warning" className="mb-4">
            <AlertDescription>
              נמצא מנוי אך לא נמצא טוקן תשלום מחזורי. יתכן שיהיו בעיות בחידוש המנוי.
            </AlertDescription>
          </Alert>
        )}
        
        {diagnosticResult?.hasWebhooks && (
          <Alert className="mb-4">
            <AlertDescription>
              נמצאו אירועי תשלום שלא עובדו במערכת. לחיצה על כפתור התיקון תנסה לעבד אותם.
            </AlertDescription>
          </Alert>
        )}
        
        {expanded && (
          <div className="mt-4 text-xs font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-40">
            <div>
              <strong>Subscription:</strong> {JSON.stringify(diagnosticResult?.subscriptionData, null, 2)}
            </div>
            <div className="mt-2">
              <strong>Token:</strong> {JSON.stringify(diagnosticResult?.tokenData, null, 2)}
            </div>
            {diagnosticResult?.webhookData?.length > 0 && (
              <div className="mt-2">
                <strong>Webhooks:</strong> {JSON.stringify(diagnosticResult?.webhookData, null, 2)}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant={expanded ? "secondary" : "outline"} 
          size="sm"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'הסתר פרטים' : 'הצג פרטים טכניים'}
        </Button>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={runDiagnostic} 
            disabled={diagnosing}
            className="flex items-center gap-1"
          >
            {diagnosing && <Loader2 className="h-3 w-3 animate-spin" />}
            בדוק שוב
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={repairSubscription} 
            disabled={repairing}
            className="flex items-center gap-1"
          >
            {repairing && <Loader2 className="h-3 w-3 animate-spin" />}
            תקן נתוני מנוי
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionDiagnostic;
