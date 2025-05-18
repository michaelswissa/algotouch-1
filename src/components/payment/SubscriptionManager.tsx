
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface SubscriptionManagerProps {
  userId: string;
  email: string;
  lowProfileId?: string;
  onComplete?: (success: boolean) => void;
  showRepairSuggestion?: boolean;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ 
  userId,
  email,
  lowProfileId,
  onComplete,
  showRepairSuggestion = false
}) => {
  const [loading, setLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [status, setStatus] = useState<'idle' | 'checking' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [diagnosticInfo, setDiagnosticInfo] = useState<any>(null);
  
  const checkSubscriptionStatus = async () => {
    try {
      setStatus('checking');
      setLoading(true);
      setErrorMessage(null);
      
      // First we log this check attempt
      await supabase.from('subscription_repair_logs').insert({
        user_id: userId,
        email: email,
        repair_type: 'status_check',
        details: {
          checkTime: new Date().toISOString(),
          lowProfileId
        }
      });
      
      // Get subscription information
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (subscriptionError) {
        if (subscriptionError.code === 'PGRST116') {
          // No subscription found
          setDiagnosticInfo({
            hasSubscription: false,
            message: 'לא נמצא מנוי פעיל'
          });
        } else {
          throw subscriptionError;
        }
      } else {
        setDiagnosticInfo({
          hasSubscription: true,
          subscriptionStatus: subscriptionData.status,
          planType: subscriptionData.plan_type,
          hasPaymentMethod: !!subscriptionData.payment_method,
          currentPeriodEnd: subscriptionData.current_period_ends_at,
          trialEnd: subscriptionData.trial_ends_at,
          contractSigned: subscriptionData.contract_signed
        });
      }
      
      // Check for payment tokens
      const { data: tokenData, error: tokenError } = await supabase
        .from('recurring_payments')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (!tokenError && tokenData && tokenData.length > 0) {
        setDiagnosticInfo(prev => ({
          ...prev,
          hasToken: true,
          tokenStatus: tokenData[0].status,
          tokenValid: tokenData[0].is_valid,
          tokenExpiry: tokenData[0].token_expiry,
          last4Digits: tokenData[0].last_4_digits
        }));
      } else {
        setDiagnosticInfo(prev => ({
          ...prev,
          hasToken: false
        }));
      }
      
      toast.success('בדיקת מנוי הושלמה');
      setStatus('success');
    } catch (err: any) {
      console.error('Error checking subscription status:', err);
      setErrorMessage(err.message || 'שגיאה בבדיקת סטטוס המנוי');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleProcessWebhook = async () => {
    try {
      setLoading(true);
      setStatus('checking');
      setErrorMessage(null);
      
      // Log this repair attempt
      await supabase.from('subscription_repair_logs').insert({
        user_id: userId,
        email: email,
        repair_type: 'repair_webhook',
        details: {
          repairTime: new Date().toISOString(),
          lowProfileId,
          retryCount
        }
      });
      
      // Process webhook for this user
      const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
        body: { 
          email,
          lowProfileId,
          userId,
          forceRefresh: retryCount > 0 // Force a deeper refresh if this is a retry
        }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success('המנוי עודכן בהצלחה');
        setStatus('success');
        if (onComplete) onComplete(true);
        
        // Reload page after short delay to show the updated subscription
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // If failed, increment retry count
        setRetryCount(prev => prev + 1);
        setErrorMessage(data?.message || 'שגיאה בעדכון המנוי');
        setStatus('error');
        
        if (retryCount >= 2) {
          // On multiple retries, offer more detailed error
          toast.error(`שגיאה בעדכון המנוי: ${data?.message || 'בעיה בתקשורת עם שרת התשלומים'}`);
        } else {
          toast.error(data?.message || 'שגיאה בעדכון המנוי');
        }
        
        if (onComplete) onComplete(false);
      }
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      setRetryCount(prev => prev + 1);
      setErrorMessage(err.message || 'שגיאה בעדכון המנוי');
      toast.error('שגיאה בעדכון המנוי');
      setStatus('error');
      if (onComplete) onComplete(false);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {status === 'success' ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : status === 'error' ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
          )}
          {status === 'success' ? 'המנוי עודכן בהצלחה' : 'כלי תיקון מנויים'}
        </CardTitle>
        <CardDescription>
          {showRepairSuggestion && 'אם אתה רואה את זה, לחץ על "תקן נתוני מנוי" לתיקון אוטומטי. אם זה נכשל, צור קשר עם התמיכה.'}
          {!showRepairSuggestion && 'בדוק ותקן את נתוני המנוי במערכת'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {errorMessage && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}
        
        {diagnosticInfo && (
          <div className="text-sm space-y-2 p-3 bg-muted rounded-md">
            <h3 className="font-semibold">מידע אבחון:</h3>
            <div className="grid grid-cols-2 gap-2">
              <div>חשבון:</div>
              <div className="font-medium">{email}</div>
              
              <div>מנוי קיים:</div>
              <div className={`font-medium ${diagnosticInfo.hasSubscription ? 'text-green-600' : 'text-red-600'}`}>
                {diagnosticInfo.hasSubscription ? 'כן' : 'לא'}
              </div>
              
              {diagnosticInfo.hasSubscription && (
                <>
                  <div>סטטוס מנוי:</div>
                  <div className="font-medium">
                    {diagnosticInfo.subscriptionStatus === 'active' && 'פעיל'}
                    {diagnosticInfo.subscriptionStatus === 'trial' && 'תקופת ניסיון'}
                    {diagnosticInfo.subscriptionStatus === 'suspended' && 'מושהה'}
                    {diagnosticInfo.subscriptionStatus === 'cancelled' && 'מבוטל'}
                    {!diagnosticInfo.subscriptionStatus && 'לא ידוע'}
                  </div>
                  
                  <div>סוג מנוי:</div>
                  <div className="font-medium">{diagnosticInfo.planType || 'לא ידוע'}</div>
                </>
              )}
              
              <div>נתוני תשלום:</div>
              <div className={`font-medium ${diagnosticInfo.hasToken ? 'text-green-600' : 'text-red-600'}`}>
                {diagnosticInfo.hasToken ? 'נמצא' : 'לא נמצא'}
              </div>
              
              {diagnosticInfo.hasToken && (
                <>
                  <div>תוקף טוקן:</div>
                  <div className={`font-medium ${diagnosticInfo.tokenValid ? 'text-green-600' : 'text-red-600'}`}>
                    {diagnosticInfo.tokenValid ? 'תקין' : 'לא תקין'}
                  </div>
                  
                  {diagnosticInfo.last4Digits && (
                    <>
                      <div>כרטיס אשראי:</div>
                      <div className="font-medium">**** {diagnosticInfo.last4Digits}</div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {retryCount > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            נראה שיש קושי בעדכון המנוי. אנו ממליצים לנסות שוב או לפנות לתמיכה אם הבעיה נמשכת.
          </p>
        )}
      </CardContent>
      <CardFooter className="flex gap-3 flex-wrap">
        <Button 
          onClick={checkSubscriptionStatus}
          variant="outline"
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading && status === 'checking' && <Loader2 className="h-4 w-4 animate-spin" />}
          <RefreshCw className={`h-4 w-4 ${status === 'checking' ? 'hidden' : ''}`} />
          בדוק סטטוס מנוי
        </Button>
        
        <Button 
          onClick={handleProcessWebhook}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          תקן נתוני מנוי
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionManager;
