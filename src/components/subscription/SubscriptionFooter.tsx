
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowUpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubscriptionFooterProps {
  planType: string | null;
}

const SubscriptionFooter: React.FC<SubscriptionFooterProps> = ({ planType }) => {
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  const handleCancelClick = () => {
    setCancelDialogOpen(true);
  };

  const handleCancelSubscription = async () => {
    try {
      setIsProcessing(true);
      const { error } = await supabase.functions.invoke('cancel-subscription', {
        body: {}
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success('המנוי בוטל בהצלחה');
      // Reload the page after a short delay to reflect the changes
      setTimeout(() => window.location.reload(), 1500);
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'אירעה שגיאה בביטול המנוי');
    } finally {
      setIsProcessing(false);
      setCancelDialogOpen(false);
    }
  };

  return (
    <div className="border-t bg-muted/20 p-3 flex justify-between">
      <Button 
        variant="ghost" 
        size="sm" 
        className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={handleCancelClick}
      >
        <XCircle className="h-4 w-4" />
        ביטול מנוי
      </Button>
      
      {planType !== 'vip' && (
        <Button 
          variant="outline" 
          size="sm"
          onClick={handleUpgrade}
          className="gap-2"
        >
          <ArrowUpCircle className="h-4 w-4" />
          שדרוג תכנית
        </Button>
      )}

      {/* Cancel Subscription Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>אתה בטוח שברצונך לבטל את המנוי?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תבטל את המנוי שלך. תוכל להמשיך להשתמש בשירות עד לסיום תקופת התשלום הנוכחית.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleCancelSubscription}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? 'מבטל מנוי...' : 'אישור ביטול המנוי'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubscriptionFooter;
