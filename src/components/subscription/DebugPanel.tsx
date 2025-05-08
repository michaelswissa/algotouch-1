
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useSubscriptionContext } from '@/contexts/subscription/SubscriptionContext';

interface DebugPanelProps {
  showDebug?: boolean;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ showDebug = false }) => {
  const { user } = useAuth();
  const { refreshSubscription } = useSubscriptionContext();
  const [isFixing, setIsFixing] = useState(false);

  // This is for debugging purposes only to help users who may have payment issues
  const handleFixSubscription = async () => {
    if (!user?.id) {
      toast.error('יש להתחבר למערכת תחילה');
      return;
    }
    
    setIsFixing(true);
    
    try {
      // Call debug subscription edge function
      const { data, error } = await supabase.functions.invoke('debug-subscription', {
        body: { userId: user.id }
      });
      
      if (error) {
        throw new Error(`Failed to fix subscription: ${error.message}`);
      }
      
      console.log('Debug subscription response:', data);
      
      // Refresh subscription data
      await refreshSubscription();
      
      toast.success('המנוי הופעל בהצלחה');
    } catch (error) {
      console.error('Error fixing subscription:', error);
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
      </CardContent>
      <CardFooter>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-yellow-600 text-yellow-600 hover:bg-yellow-100 hover:text-yellow-800 dark:hover:bg-yellow-900 dark:border-yellow-400 dark:text-yellow-400"
          onClick={handleFixSubscription}
          disabled={isFixing}
        >
          {isFixing ? 'מפעיל מנוי...' : 'הפעל מנוי'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DebugPanel;
