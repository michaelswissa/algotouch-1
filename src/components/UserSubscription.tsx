
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Calendar, CreditCard, Settings, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';

interface Subscription {
  id: string;
  plan_type: string;
  status: string;
  trial_ends_at: string | null;
  current_period_ends_at: string | null;
  payment_method: {
    lastFourDigits: string;
    expiryMonth: string;
    expiryYear: string;
  } | null;
}

const UserSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSubscription = async () => {
      if (user?.id) {
        try {
          const { data, error } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (error) {
            throw error;
          }
          
          setSubscription(data);
        } catch (error) {
          console.error('Error fetching subscription:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchSubscription();
  }, [user]);

  const getSubscriptionDetails = () => {
    if (!subscription) return null;
    
    const planName = subscription.plan_type === 'annual' ? 'שנתי' : 'חודשי';
    const planPrice = subscription.plan_type === 'annual' ? '899' : '99';
    
    let statusText = '';
    let nextBillingDate = '';
    let progressValue = 0;
    let daysLeft = 0;
    
    if (subscription.status === 'trial' && subscription.trial_ends_at) {
      const trialEndDate = parseISO(subscription.trial_ends_at);
      daysLeft = Math.max(0, differenceInDays(trialEndDate, new Date()));
      progressValue = Math.max(0, Math.min(100, (30 - daysLeft) / 30 * 100));
      
      statusText = 'בתקופת ניסיון';
      nextBillingDate = format(trialEndDate, 'dd/MM/yyyy', { locale: he });
    } else if (subscription.current_period_ends_at) {
      const periodEndDate = parseISO(subscription.current_period_ends_at);
      const periodStartDate = addMonths(periodEndDate, -1);
      daysLeft = Math.max(0, differenceInDays(periodEndDate, new Date()));
      const totalDays = differenceInDays(periodEndDate, periodStartDate);
      progressValue = Math.max(0, Math.min(100, (totalDays - daysLeft) / totalDays * 100));
      
      statusText = 'פעיל';
      nextBillingDate = format(periodEndDate, 'dd/MM/yyyy', { locale: he });
    }
    
    return {
      planName,
      planPrice,
      statusText,
      nextBillingDate,
      progressValue,
      daysLeft,
      paymentMethod: subscription.payment_method
    };
  };

  const details = getSubscriptionDetails();

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="space-y-2">
            <div className="h-5 bg-muted rounded-md animate-pulse w-1/3"></div>
            <div className="h-8 bg-muted rounded-md animate-pulse w-1/2"></div>
            <div className="h-4 bg-muted rounded-md animate-pulse w-3/4 mt-4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>אין לך מנוי פעיל</CardTitle>
          <CardDescription>הרשם עכשיו כדי לקבל גישה מלאה למערכת</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => navigate('/subscription')}>הרשם עכשיו</Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" dir="rtl">
      <CardHeader className="pb-3">
        <CardTitle>מנוי {details?.planName}</CardTitle>
        <CardDescription>סטטוס: {details?.statusText}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {subscription.status === 'trial' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>תקופת ניסיון</span>
              <span className="font-medium">{details?.daysLeft} ימים נותרו</span>
            </div>
            <Progress value={details?.progressValue} className="h-2" />
          </div>
        )}
        
        <div className="grid grid-cols-1 gap-4 mt-4">
          <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
            <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium">החיוב הבא</h4>
              <p className="text-sm text-muted-foreground">{details?.nextBillingDate}</p>
            </div>
          </div>
          
          {details?.paymentMethod && (
            <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
              <CreditCard className="h-5 w-5 text-primary flex-shrink-0" />
              <div>
                <h4 className="text-sm font-medium">אמצעי תשלום</h4>
                <p className="text-sm text-muted-foreground">
                  כרטיס אשראי המסתיים ב-{details.paymentMethod.lastFourDigits} (תוקף: {details.paymentMethod.expiryMonth}/{details.paymentMethod.expiryYear.slice(-2)})
                </p>
              </div>
            </div>
          )}
          
          <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
            <Settings className="h-5 w-5 text-primary flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium">סכום החיוב</h4>
              <p className="text-sm text-muted-foreground">₪{details?.planPrice} בתאריך {details?.nextBillingDate}</p>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="border-t bg-muted/20 p-3 flex justify-between">
        <Button variant="ghost" size="sm" className="gap-2 text-destructive hover:text-destructive hover:bg-destructive/10">
          <XCircle className="h-4 w-4" />
          ביטול מנוי
        </Button>
        <Button variant="outline" size="sm">
          שינוי תכנית
        </Button>
      </CardFooter>
    </Card>
  );
};

export default UserSubscription;
