
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SubscriptionManagerProps {
  userId: string;
  email: string;
  lowProfileId?: string;
  onComplete?: (success: boolean) => void;
}

export const SubscriptionManager: React.FC<SubscriptionManagerProps> = ({ 
  userId,
  email,
  lowProfileId,
  onComplete 
}) => {
  const [loading, setLoading] = useState(false);
  
  const handleProcessWebhook = async () => {
    try {
      setLoading(true);
      
      // Process webhook for this user
      const { data, error } = await supabase.functions.invoke('reprocess-webhook-by-email', {
        body: { 
          email,
          lowProfileId,
          userId 
        }
      });
      
      if (error) throw error;
      
      if (data.success) {
        toast.success('המנוי עודכן בהצלחה');
        if (onComplete) onComplete(true);
        
        // Reload page after short delay to show the updated subscription
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast.error(data.message || 'שגיאה בעדכון המנוי');
        if (onComplete) onComplete(false);
      }
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      toast.error('שגיאה בעדכון המנוי');
      if (onComplete) onComplete(false);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle>נראה שהתשלום שלך התקבל</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          מערכת התשלומים קיבלה את פרטי התשלום שלך, אך נראה שיש צורך בעדכון נוסף כדי להשלים את תהליך המנוי.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleProcessWebhook}
          disabled={loading}
        >
          {loading ? 'מעבד...' : 'עדכן פרטי מנוי'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionManager;
