
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import CancellationSurvey from './CancellationSurvey';
import { useSubscription } from '@/hooks/useSubscription';
import { differenceInDays, parseISO } from 'date-fns';

interface SubscriptionFooterProps {
  planType: string;
  endDate: string | null;
  isCancelled: boolean;
}

const SubscriptionFooter = ({ planType, endDate, isCancelled }: SubscriptionFooterProps) => {
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { cancelSubscription, reactivateSubscription } = useSubscription();
  
  // Check if cancellation is recent (within 30 days) for reactivation
  const canReactivate = isCancelled && endDate && 
    differenceInDays(parseISO(endDate), new Date()) > 0;
  
  // Count days since cancellation
  const daysUntilExpiry = endDate ? 
    Math.max(0, differenceInDays(parseISO(endDate), new Date())) : 0;

  const handleCancel = async (reason: string, feedback: string) => {
    setError(null);
    setIsProcessing(true);
    
    try {
      const success = await cancelSubscription(reason, feedback);
      
      if (success) {
        setIsCancelDialogOpen(false);
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בביטול המנוי');
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleReactivate = async () => {
    setError(null);
    setIsProcessing(true);
    
    try {
      const success = await reactivateSubscription();
      
      if (!success) {
        setError('שגיאה בהפעלת המנוי מחדש');
      }
    } catch (err: any) {
      setError(err.message || 'שגיאה בהפעלת המנוי מחדש');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <>
      <CardFooter className={`flex ${isCancelled ? 'justify-center' : 'justify-end'} pt-4 border-t`}>
        {isCancelled ? (
          canReactivate ? (
            <div className="text-center">
              <p className="text-sm text-muted-foreground mb-2">
                המנוי בוטל וייסגר בתוך {daysUntilExpiry} ימים
              </p>
              <Button 
                variant="outline" 
                onClick={handleReactivate}
                disabled={isProcessing}
              >
                {isProcessing ? 'מעבד בקשה...' : 'הפעל מנוי מחדש'}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                המנוי בוטל ונסגר
              </p>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/subscription'}
                className="mt-2"
              >
                הצטרף מחדש
              </Button>
            </div>
          )
        ) : (
          planType !== 'vip' && (
            <Button 
              variant="outline" 
              onClick={() => setIsCancelDialogOpen(true)}
              className="text-destructive hover:text-destructive"
            >
              ביטול מנוי
            </Button>
          )
        )}
      </CardFooter>
      
      <CancellationSurvey 
        open={isCancelDialogOpen}
        onOpenChange={setIsCancelDialogOpen}
        onCancel={handleCancel}
        isProcessing={isProcessing}
        error={error}
      />
    </>
  );
};

export default SubscriptionFooter;
