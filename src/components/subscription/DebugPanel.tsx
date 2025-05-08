
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';
import { Loader2 } from 'lucide-react';

interface DebugPanelProps {
  showDebug?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ showDebug = false }) => {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscriptionContext();
  const [isFixing, setIsFixing] = useState(false);
  const [isForceCreate, setIsForceCreate] = useState(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);

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
        <CardTitle className="flex items-center gap-2 text-lg">
          <span>תיקון בעיות מנוי</span>
          <Badge variant="outline" className="bg-yellow-200 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-200">
            Debug
          </Badge>
        </CardTitle>
        <CardDescription>
          אפשרות זו מיועדת לפתרון בעיות מנוי שלא הופעל כראוי אחרי תשלום מוצלח
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-yellow-700 dark:text-yellow-400">
          במידה וביצעת תשלום באתר אך המנוי לא הופעל באופן אוטומטי, ניתן לנסות להפעיל אותו ידנית.
        </p>
        
        {errorDetails && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
            <p className="text-xs text-red-700 dark:text-red-400">
              פרטי שגיאה: {errorDetails}
            </p>
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
