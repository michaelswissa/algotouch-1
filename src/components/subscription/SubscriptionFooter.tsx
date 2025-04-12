import React from 'react';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface SubscriptionFooterProps {
  subscriptionId?: string;
  status?: string;
  planType?: string;
  onCancelled?: () => void;
}

const SubscriptionFooter: React.FC<SubscriptionFooterProps> = ({
  subscriptionId,
  status = '',
  planType = '',
  onCancelled
}) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const showCancellation = status === 'active' && (planType === 'monthly' || planType === 'annual');
  
  if (planType === 'vip' || status === 'cancelled') {
    return null;
  }

  const handleCancelSubscription = async () => {
    if (!subscriptionId) {
      toast({
        title: "שגיאה",
        description: "לא ניתן לבטל את המנוי כעת, אנא נסה שוב מאוחר יותר",
        variant: "destructive"
      });
      return;
    }
    
    if (!window.confirm("האם אתה בטוח שברצונך לבטל את המנוי? המנוי יישאר פעיל עד תום תקופת החיוב הנוכחית.")) {
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('cardcom-recurring', {
        body: {
          action: 'cancel',
          subscriptionId
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      if (!data.success) {
        throw new Error(data.error || "ארעה שגיאה בעת ביטול המנוי");
      }
      
      toast({
        title: "המנוי בוטל בהצלחה",
        description: "המנוי יישאר פעיל עד תום תקופת החיוב הנוכחית",
        variant: "default"
      });
      
      if (onCancelled) {
        onCancelled();
      } else {
        setTimeout(() => {
          navigate(0);
        }, 1500);
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast({
        title: "שגיאה בביטול המנוי",
        description: error instanceof Error ? error.message : "ארעה שגיאה בעת ביטול המנוי",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-8 space-y-4">
      <Alert variant="default" className="bg-amber-50 border-amber-200">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <AlertDescription className="text-amber-700">
          {status === 'trial' ? (
            <>לאחר תקופת הניסיון יחל חיוב אוטומטי בהתאם למסלול שבחרת.</>
          ) : (
            <>המנוי יחודש באופן אוטומטי בסוף כל תקופה. ניתן לבטל את החידוש האוטומטי בכל עת.</>
          )}
        </AlertDescription>
      </Alert>
      
      {showCancellation && (
        <div className="flex justify-center">
          <Button 
            variant="outline" 
            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={handleCancelSubscription}
            disabled={isLoading}
          >
            {isLoading ? "מבטל מנוי..." : "ביטול המנוי"}
          </Button>
        </div>
      )}
      
      <div className="text-center text-xs text-muted-foreground mt-6">
        <p>לעזרה ותמיכה ניתן לפנות ל-
          <a href="mailto:support@example.com" className="text-primary hover:underline">support@example.com</a>
        </p>
      </div>
    </div>
  );
};

export default SubscriptionFooter;
