
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { Loader2, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface DebugPanelProps {
  showDebug?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ showDebug = false }) => {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscriptionContext();
  const [isFixing, setIsFixing] = useState(false);
  const [isForceCreate, setIsForceCreate] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (showDebug && user?.id) {
      loadPaymentHistory();
    }
  }, [showDebug, user?.id]);

  const loadPaymentHistory = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      // Get payment logs to display in debugging panel
      const { data, error } = await supabase
        .from('payment_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);
        
      if (error) throw new Error(error.message);
      
      setPaymentHistory(data || []);
    } catch (err: any) {
      console.error('Failed to load payment history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // This is for debugging purposes only to help users who may have payment issues
  const handleFixSubscription = async () => {
    if (!user?.id) {
      toast.error('יש להתחבר למערכת תחילה');
      return;
    }
    
    setErrorDetails(null);
    setIsFixing(true);
    
    try {
      // Call debug subscription edge function with force create option
      const { data, error } = await supabase.functions.invoke('debug-subscription', {
        body: { 
          userId: user.id,
          forceCreate: isForceCreate
        }
      });
      
      if (error) {
        throw new Error(`Failed to fix subscription: ${error.message}`);
      }
      
      console.log('Debug subscription response:', data);
      
      if (data.error) {
        throw new Error(`Error from server: ${data.error}`);
      }
      
      // Refresh subscription data
      await refreshSubscription();
      
      // Also refresh payment history
      await loadPaymentHistory();
      
      toast.success(data.message || 'המנוי הופעל בהצלחה');
    } catch (error: any) {
      console.error('Error fixing subscription:', error);
      setErrorDetails(error.message || 'Unknown error');
      toast.error('שגיאה בהפעלת המנוי');
    } finally {
      setIsFixing(false);
    }
  };

  if (!showDebug) return null;

  return (
    <Card className="my-4 border-dashed border-yellow-500 bg-yellow-50 dark:bg-yellow-900/10">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <span>תיקון בעיות מנוי</span>
            <Badge variant="outline" className="bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
              Debug
            </Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'הסתר מידע מורחב' : 'הצג מידע מורחב'}
          </Button>
        </div>
        <CardDescription>
          אפשרות זו מיועדת לפתרון בעיות מנוי שלא הופעל כראוי אחרי תשלום מוצלח
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-yellow-700 dark:text-yellow-400 mb-3">
          במידה וביצעת תשלום באתר אך המנוי לא הופעל באופן אוטומטי, ניתן לנסות להפעיל אותו ידנית.
        </p>
        
        {errorDetails && (
          <Alert variant="destructive" className="mb-3">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>שגיאה בהפעלת המנוי</AlertTitle>
            <AlertDescription className="text-xs">
              {errorDetails}
            </AlertDescription>
          </Alert>
        )}
        
        {showAdvanced && (
          <div className="mt-3 space-y-2">
            <h4 className="text-sm font-medium">היסטוריית תשלומים אחרונה:</h4>
            {isLoading ? (
              <div className="flex justify-center py-2">
                <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
              </div>
            ) : paymentHistory.length > 0 ? (
              <div className="space-y-2">
                {paymentHistory.map((payment, idx) => (
                  <div 
                    key={idx} 
                    className="p-2 bg-white/50 dark:bg-gray-800/50 border border-yellow-200 dark:border-yellow-900 rounded-md text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">
                        {payment.payment_status === 'completed' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500 inline mr-1" />
                        ) : (
                          <AlertTriangle className="h-4 w-4 text-amber-500 inline mr-1" />
                        )}
                        {payment.amount} ₪
                      </span>
                      <Badge 
                        variant={payment.payment_status === 'completed' ? 'outline' : 'secondary'}
                        className={payment.payment_status === 'completed' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {payment.payment_status}
                      </Badge>
                    </div>
                    <div className="mt-1 flex justify-between">
                      <span>תוכנית: {payment.plan_id}</span>
                      <span>
                        {new Date(payment.created_at).toLocaleDateString('he-IL')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription>
                  לא נמצאו רשומות תשלום עבור המשתמש
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col items-start gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="border-yellow-600 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-800 dark:hover:bg-yellow-900 dark:border-yellow-400 dark:text-yellow-400"
          onClick={handleFixSubscription}
          disabled={isFixing}
        >
          {isFixing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              מפעיל מנוי...
            </>
          ) : (
            'הפעל מנוי'
          )}
        </Button>
        
        <div className="flex items-center mt-1">
          <input
            type="checkbox"
            id="force-create"
            checked={isForceCreate}
            onChange={() => setIsForceCreate(!isForceCreate)} 
            className="mr-2"
          />
          <label htmlFor="force-create" className="text-xs text-yellow-700 dark:text-yellow-400">
            אפשר יצירה גם אם קיים מנוי פעיל
          </label>
        </div>
      </CardFooter>
    </Card>
  );
};

export default DebugPanel;
