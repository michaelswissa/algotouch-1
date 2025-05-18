
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { processWebhookByEmail } from '@/features/payment/services/cardcomService';
import { PaymentLogger } from '@/services/logging/paymentLogger';

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
  const [retryCount, setRetryCount] = useState(0);
  
  const handleProcessWebhook = async () => {
    try {
      setLoading(true);
      
      // Log the repair attempt for audit purposes
      await PaymentLogger.info(
        'Subscription repair attempt initiated',
        'subscription_repair',
        { email, lowProfileId, userId },
        userId
      );
      
      // Process webhook for this user using our encapsulated service
      const result = await processWebhookByEmail(email, lowProfileId, userId);
      
      if (result.success) {
        toast.success('המנוי עודכן בהצלחה');
        
        // Log successful repair
        await PaymentLogger.success(
          'Subscription repair completed successfully',
          'subscription_repair',
          { email, result },
          userId
        );
        
        if (onComplete) onComplete(true);
        
        // Reload page after short delay to show the updated subscription
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        // If failed, increment retry count
        setRetryCount(prev => prev + 1);
        
        // Log failed repair attempt
        await PaymentLogger.error(
          `Subscription repair failed: ${result.message || 'Unknown error'}`,
          'subscription_repair',
          { email, lowProfileId, error: result.message, retryCount: retryCount + 1 },
          userId
        );
        
        if (retryCount >= 2) {
          // On multiple retries, offer more detailed error
          toast.error(`שגיאה בעדכון המנוי: ${result.message || 'בעיה בתקשורת עם שרת התשלומים'}`);
        } else {
          toast.error(result.message || 'שגיאה בעדכון המנוי');
        }
        
        if (onComplete) onComplete(false);
      }
    } catch (err: any) {
      console.error('Error processing webhook:', err);
      setRetryCount(prev => prev + 1);
      
      // Log error in repair attempt
      await PaymentLogger.error(
        'Exception during subscription repair',
        'subscription_repair',
        { email, lowProfileId, error: err.message, stack: err.stack },
        userId
      );
      
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
        <CardDescription>
          נדרש עדכון של פרטי המנוי במערכת
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          מערכת התשלומים קיבלה את פרטי התשלום שלך, אך נראה שיש צורך בעדכון נוסף כדי להשלים את תהליך המנוי.
        </p>
        {retryCount > 0 && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            נראה שיש קושי בעדכון המנוי. אנו ממליצים לנסות שוב או לפנות לתמיכה אם הבעיה נמשכת.
          </p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleProcessWebhook}
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'מעבד...' : 'תקן נתוני מנוי'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SubscriptionManager;
