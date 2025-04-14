
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, Check, CreditCard, Clock, AlertTriangle } from 'lucide-react';
import { format, formatDistance } from 'date-fns';
import { he } from 'date-fns/locale';
import { formatPrice, getPlanById } from '@/components/payment/utils/paymentHelpers';
import { Spinner } from '@/components/ui/spinner';

const MySubscription = () => {
  const navigate = useNavigate();
  const { isLoading, isActive, planType, expiresAt, trialEndsAt, error } = useSubscriptionStatus();

  useEffect(() => {
    // If there's a subscription error, navigate to subscription page
    if (error && !isLoading) {
      navigate('/subscription');
    }
  }, [error, isLoading, navigate]);

  if (isLoading) {
    return (
      <Layout className="py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  // If no active subscription, redirect to subscription page
  if (!isActive && !isLoading) {
    return (
      <Layout className="py-8">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>אין לך מנוי פעיל</CardTitle>
              <CardDescription>
                כדי לקבל גישה לכל התוכן, אנא בחר תכנית מנוי.
              </CardDescription>
            </CardHeader>
            <CardFooter>
              <Button onClick={() => navigate('/subscription')} className="w-full">
                בחר מנוי
              </Button>
            </CardFooter>
          </Card>
        </div>
      </Layout>
    );
  }

  // Get plan details
  const plan = planType ? getPlanById(planType) : null;
  const planName = plan?.name || 'מנוי';
  const planPrice = plan?.price ? formatPrice(plan.price) : '';
  const billingCycle = plan?.billingCycle === 'monthly' 
    ? 'לחודש' 
    : plan?.billingCycle === 'yearly' 
      ? 'לשנה' 
      : 'תשלום חד פעמי';

  // Determine subscription status and next billing date
  const isInTrial = trialEndsAt && new Date(trialEndsAt) > new Date();
  const nextBillingDate = expiresAt ? format(new Date(expiresAt), 'dd/MM/yyyy', { locale: he }) : 'לא זמין';
  const timeUntilExpiration = expiresAt 
    ? formatDistance(new Date(expiresAt), new Date(), { addSuffix: true, locale: he })
    : '';
  
  return (
    <Layout className="py-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <h1 className="text-3xl font-bold">המנוי שלי</h1>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{planName}</CardTitle>
                <CardDescription>
                  {planPrice} {billingCycle}
                </CardDescription>
              </div>
              
              <Badge variant={isInTrial ? "outline" : "default"}>
                {isInTrial ? 'תקופת ניסיון' : 'פעיל'}
              </Badge>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isInTrial && trialEndsAt && (
              <div className="flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                <div>
                  <p>תקופת הניסיון שלך תסתיים ב-{format(new Date(trialEndsAt), 'dd/MM/yyyy', { locale: he })}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDistance(new Date(trialEndsAt), new Date(), { addSuffix: true, locale: he })}
                  </p>
                </div>
              </div>
            )}
            
            {!isInTrial && expiresAt && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-green-600" />
                <div>
                  <p>החיוב הבא: {nextBillingDate}</p>
                  <p className="text-sm text-muted-foreground">{timeUntilExpiration}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <div>
                <p>אמצעי תשלום: כרטיס אשראי</p>
                <p className="text-sm text-muted-foreground">מסתיים ב-****</p>
              </div>
            </div>
            
            <div className="pt-4">
              <h3 className="font-medium mb-2">המנוי שלך כולל:</h3>
              <ul className="space-y-2">
                {plan?.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col space-y-4">
            {plan?.billingCycle !== 'once' && (
              <Button variant="outline" className="w-full" onClick={() => navigate('/subscription')}>
                שדרג את המנוי שלך
              </Button>
            )}
            
            <div className="text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>
                  אם תבטל את המנוי שלך, תוכל להמשיך להשתמש בשירות עד {nextBillingDate}.
                </span>
              </div>
            </div>
          </CardFooter>
        </Card>
      </div>
    </Layout>
  );
};

export default MySubscription;
