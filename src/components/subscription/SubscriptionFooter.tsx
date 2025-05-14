
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import CancellationSurvey from './CancellationSurvey';
import { useSubscription } from '@/hooks/useSubscription';
import { differenceInDays, parseISO, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { AlertTriangle, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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

  const formattedEndDate = endDate ? 
    format(parseISO(endDate), 'dd/MM/yyyy', { locale: he }) : '';

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

  const getStatusBadge = () => {
    if (isCancelled) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700 dark:text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span>מבוטל</span>
        </Badge>
      );
    }
    
    if (planType === 'vip') {
      return (
        <Badge variant="outline" className="border-purple-500 text-purple-700 dark:text-purple-400 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          <span>VIP</span>
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="border-green-500 text-green-700 dark:text-green-400 flex items-center gap-1">
        <CheckCircle className="h-3 w-3" />
        <span>פעיל</span>
      </Badge>
    );
  };
  
  return (
    <>
      <CardFooter className="flex flex-col items-center pt-4 border-t">
        <div className="flex items-center justify-between w-full mb-2">
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            {endDate && (
              <span className="text-xs text-muted-foreground">
                {isCancelled ? 'יסתיים ב:' : 'חידוש הבא:'} {formattedEndDate}
              </span>
            )}
          </div>
          
          {isCancelled ? (
            canReactivate ? (
              <Button 
                variant="outline"
                size="sm" 
                onClick={handleReactivate}
                disabled={isProcessing}
                className="flex items-center gap-1 text-green-600 hover:text-green-700 border-green-400 hover:bg-green-50 dark:hover:bg-green-950"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>{isProcessing ? 'מעבד בקשה...' : 'הפעל מחדש'}</span>
              </Button>
            ) : (
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = '/subscription'}
                className="flex items-center gap-1 text-primary"
              >
                <span>הצטרף מחדש</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )
          ) : (
            planType !== 'vip' && (
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setIsCancelDialogOpen(true)}
                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:hover:bg-red-950"
              >
                ביטול מנוי
              </Button>
            )
          )}
        </div>
        
        {isCancelled && daysUntilExpiry > 0 && (
          <div className="flex items-center gap-2 w-full mt-2 text-sm bg-amber-50 dark:bg-amber-950/30 p-2 rounded-md">
            <AlertCircle className="h-4 w-4 text-amber-500" />
            <span className="text-amber-700 dark:text-amber-400">
              המנוי יישאר פעיל עוד {daysUntilExpiry} ימים
            </span>
          </div>
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
