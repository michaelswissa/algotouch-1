import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowUpCircle, CheckCircle } from 'lucide-react';
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
import CancellationSurvey from './CancellationSurvey';
import { format, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';

interface SubscriptionFooterProps {
  planType: string | null;
  endDate?: string | null;
  isCancelled?: boolean;
}

const SubscriptionFooter: React.FC<SubscriptionFooterProps> = ({ 
  planType, 
  endDate = null,
  isCancelled = false
}) => {
  const navigate = useNavigate();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [surveyOpen, setSurveyOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cancellationSuccess, setCancellationSuccess] = useState(false);
  const [accessEndDate, setAccessEndDate] = useState<string | null>(endDate);

  const handleUpgrade = () => {
    navigate('/subscription');
  };

  const handleCancelClick = () => {
    if (isCancelled) {
      toast.info(
        `המנוי כבר בוטל ויסתיים ב-${accessEndDate ? format(parseISO(accessEndDate), 'dd/MM/yyyy', { locale: he }) : 'בקרוב'}`
      );
    } else {
      setCancelDialogOpen(true);
    }
  };

  const handleInitialConfirmation = () => {
    setCancelDialogOpen(false);
    setSurveyOpen(true);
  };

  const handleCancelSubscription = async (reason: string, feedback: string) => {
    try {
      setIsProcessing(true);
      const { data, error } = await supabase.functions.invoke('cancel-subscription', {
        body: { 
          cancellationReason: reason,
          feedback
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'אירעה שגיאה בביטול המנוי');
      }

      if (data.endDate) {
        setAccessEndDate(data.endDate);
      }

      toast.success('המנוי בוטל בהצלחה', {
        description: `תוכל להשתמש במערכת עד ${data.endDate ? format(parseISO(data.endDate), 'dd/MM/yyyy', { locale: he }) : 'סוף תקופת החיוב הנוכחית'}`
      });
      
      setCancellationSuccess(true);
      
      setTimeout(() => {
        setSurveyOpen(false);
        setTimeout(() => window.location.reload(), 500);
      }, 1000);
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      toast.error(error.message || 'אירעה שגיאה בביטול המנוי');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivate = () => {
    navigate('/subscription');
    toast.info('ניתן להירשם מחדש בדף ההרשמה');
  };

  return (
    <div className="border-t bg-muted/20 p-3 flex justify-between">
      {isCancelled ? (
        <>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-yellow-500" />
            <span>
              המנוי בוטל ויסתיים ב-{accessEndDate ? format(parseISO(accessEndDate), 'dd/MM/yyyy', { locale: he }) : 'קרוב'}
            </span>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleReactivate}
            className="gap-2"
          >
            <ArrowUpCircle className="h-4 w-4" />
            חידוש מנוי
          </Button>
        </>
      ) : (
        <>
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
        </>
      )}

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-md" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>האם אתה בטוח שברצונך לבטל את המנוי?</AlertDialogTitle>
            <AlertDialogDescription>
              פעולה זו תבטל את המנוי שלך. תוכל להמשיך להשתמש בשירות עד לסיום תקופת התשלום הנוכחית.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>ביטול</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleInitialConfirmation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              המשך לביטול המנוי
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CancellationSurvey 
        open={surveyOpen}
        onOpenChange={setSurveyOpen}
        onCancel={handleCancelSubscription}
        isProcessing={isProcessing}
      />
    </div>
  );
};

export default SubscriptionFooter;
