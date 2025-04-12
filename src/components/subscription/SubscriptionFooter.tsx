
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

interface SubscriptionFooterProps {
  subscriptionId: string;
  status: string;
  planType: string;
  onCancelled?: () => void;
}

const SubscriptionFooter: React.FC<SubscriptionFooterProps> = ({
  subscriptionId,
  status,
  planType,
  onCancelled
}) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  // VIP subscriptions cannot be cancelled as they're lifetime
  const canCancel = planType !== 'vip' && status !== 'cancelled';

  const handleCancel = async () => {
    try {
      setIsCancelling(true);
      
      // Call the server to cancel the subscription
      const { error } = await supabase.functions.invoke('cardcom-recurring', {
        body: { 
          action: 'cancel',
          subscriptionId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      toast.success('המנוי בוטל בהצלחה');
      setShowCancelDialog(false);
      
      // Trigger parent refresh
      if (onCancelled) onCancelled();
      
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('אירעה שגיאה בביטול המנוי');
    } finally {
      setIsCancelling(false);
    }
  };
  
  return (
    <div className="mt-8 space-y-4 border-t pt-4">
      <div className="flex justify-between items-center">
        <Button variant="link" size="sm" className="text-muted-foreground" asChild>
          <a 
            href="https://support.example.com/billing" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center"
          >
            צור קשר עם התמיכה <ExternalLink className="h-3.5 w-3.5 ms-1" />
          </a>
        </Button>
        
        {canCancel && (
          <Button 
            variant="outline" 
            onClick={() => setShowCancelDialog(true)}
          >
            בטל מנוי
          </Button>
        )}
      </div>
      
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>בטוח שברצונך לבטל את המנוי?</AlertDialogTitle>
            <AlertDialogDescription>
              ביטול המנוי יסתיים בסוף תקופת החיוב הנוכחית. לא יבוצעו חיובים נוספים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>חזור</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleCancel();
              }}
              disabled={isCancelling}
            >
              {isCancelling ? 'מבטל מנוי...' : 'אישור ביטול'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionFooter;
