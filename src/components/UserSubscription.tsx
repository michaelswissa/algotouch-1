
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';

// Import our components
import SubscriptionCard from './subscription/SubscriptionCard';
import SubscriptionStatus from './subscription/SubscriptionStatus';
import BillingInfo from './subscription/BillingInfo';
import PaymentMethodInfo from './subscription/PaymentMethodInfo';
import SubscriptionFooter from './subscription/SubscriptionFooter';
import LoadingSkeleton from './subscription/LoadingSkeleton';
import ContractViewer from './subscription/ContractViewer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, BarChart3, Loader2 } from 'lucide-react';
import { cancelSubscription } from '@/lib/subscription/cancellation-service';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from '@/components/ui/alert';
import { getUserSubscriptionActivity } from '@/lib/subscription/analytics-service';

const UserSubscription = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { subscription, loading, details } = useSubscription();
  const [activeTab, setActiveTab] = useState('details');
  
  // Cancellation dialog state
  const [cancellationDialogOpen, setCancellationDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationFeedback, setCancellationFeedback] = useState('');
  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  
  // User activity metrics
  const [userActivity, setUserActivity] = useState<any>(null);
  const [loadingActivity, setLoadingActivity] = useState(false);
  
  // Function to load user activity when analytics tab is selected
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    
    if (value === 'analytics' && user?.id && !userActivity && !loadingActivity) {
      setLoadingActivity(true);
      
      getUserSubscriptionActivity(user.id)
        .then(result => {
          if (result.success && result.data) {
            setUserActivity(result.data);
          }
        })
        .catch(error => {
          console.error('Error loading user activity:', error);
        })
        .finally(() => {
          setLoadingActivity(false);
        });
    }
  };
  
  // Handle subscription cancellation
  const handleCancelSubscription = async () => {
    if (!user?.id || !subscription) return;
    
    setIsCancellingSubscription(true);
    
    try {
      const result = await cancelSubscription({
        userId: user.id,
        subscriptionId: subscription.id,
        reason: cancellationReason,
        feedback: cancellationFeedback,
        email: user.email || undefined,
        fullName: details?.fullName,
        planType: subscription.plan_type
      });
      
      if (result.success) {
        toast.success('המנוי בוטל בהצלחה. השינוי יתבצע בסוף תקופת החיוב הנוכחית.');
        setCancellationDialogOpen(false);
        
        // Refresh subscription data
        window.location.reload();
      } else {
        toast.error('אירעה שגיאה בביטול המנוי. אנא נסה שנית או צור קשר עם התמיכה.');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('אירעה שגיאה בביטול המנוי.');
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton />;
  }

  // Check if user has registration data in progress
  const hasRegistrationInProgress = !!sessionStorage.getItem('registration_data');
  
  if (hasRegistrationInProgress) {
    return (
      <SubscriptionCard 
        title="השלם את תהליך ההרשמה" 
        description="התחלת את תהליך ההרשמה. אנא השלם את התהליך כדי לקבל גישה מלאה."
      >
        <div className="text-center py-6">
          <Button 
            onClick={() => navigate('/subscription')}
            className="mx-auto"
          >
            המשך להרשמה
          </Button>
        </div>
      </SubscriptionCard>
    );
  }

  if (!subscription) {
    return (
      <SubscriptionCard 
        title="אין לך מנוי פעיל" 
        description="הרשם עכשיו כדי לקבל גישה מלאה למערכת"
      >
        <div className="text-center py-6">
          <Button 
            onClick={() => navigate('/subscription')}
            className="mx-auto"
          >
            בחר תכנית מנוי
          </Button>
        </div>
      </SubscriptionCard>
    );
  }

  const hasTrial = subscription.status === 'trial' || subscription.plan_type === 'monthly';
  const hasContract = subscription.contract_signed;
  const isCancelled = !!subscription.cancelled_at;

  return (
    <SubscriptionCard
      title={`מנוי ${details?.planName}`}
      description={`סטטוס: ${details?.statusText}`}
    >
      <>
        {/* Cancellation notice if applicable */}
        {isCancelled && (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              המנוי בוטל ויסתיים בתאריך {new Date(subscription.current_period_ends_at || '').toLocaleDateString('he-IL')}
            </AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="details" value={activeTab} onValueChange={handleTabChange} className="my-2 w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">פרטי מנוי</TabsTrigger>
            <TabsTrigger value="contract">הסכם</TabsTrigger>
            <TabsTrigger value="analytics">נתונים</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            {subscription.status === 'trial' && details && (
              <SubscriptionStatus 
                status={subscription.status} 
                daysLeft={details.daysLeft} 
                progressValue={details.progressValue} 
              />
            )}
            
            <div className="grid grid-cols-1 gap-4 mt-4">
              {details && (
                <>
                  <BillingInfo 
                    nextBillingDate={details.nextBillingDate} 
                    planPrice={details.planPrice}
                    currency="$"
                  />
                  
                  <PaymentMethodInfo 
                    paymentMethod={details.paymentMethod} 
                  />
                </>
              )}
              
              {!isCancelled && (
                <div className="mt-4 flex justify-end">
                  <Dialog open={cancellationDialogOpen} onOpenChange={setCancellationDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="text-destructive border-destructive hover:bg-destructive/10">
                        בטל מנוי
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>ביטול מנוי</DialogTitle>
                        <DialogDescription>
                          מנוי שבוטל ימשיך לפעול עד סוף תקופת החיוב הנוכחית. לאחר מכן, הגישה לתכונות פרימיום תוגבל.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                          <span className="text-right col-span-4">סיבת ביטול</span>
                          <div className="col-span-4">
                            <Select onValueChange={setCancellationReason}>
                              <SelectTrigger>
                                <SelectValue placeholder="בחר סיבה" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="too_expensive">יקר מדי</SelectItem>
                                <SelectItem value="not_useful">לא מספיק שימושי</SelectItem>
                                <SelectItem value="missing_features">חסרות תכונות</SelectItem>
                                <SelectItem value="switching">מעבר לשירות אחר</SelectItem>
                                <SelectItem value="temporary">ביטול זמני</SelectItem>
                                <SelectItem value="other">אחר</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                          <span className="text-right col-span-4">משוב נוסף (אופציונלי)</span>
                          <Textarea 
                            className="col-span-4" 
                            placeholder="ספר לנו יותר על הסיבה לביטול המנוי..."
                            value={cancellationFeedback}
                            onChange={(e) => setCancellationFeedback(e.target.value)}
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button 
                          variant="outline" 
                          onClick={() => setCancellationDialogOpen(false)}
                        >
                          ביטול
                        </Button>
                        <Button 
                          variant="destructive"
                          onClick={handleCancelSubscription}
                          disabled={!cancellationReason || isCancellingSubscription}
                        >
                          {isCancellingSubscription && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          {isCancellingSubscription ? 'מבטל מנוי...' : 'אישור ביטול מנוי'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="contract" className="mt-4">
            {hasContract ? (
              <ContractViewer />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">לא נמצא הסכם חתום</p>
                <Button 
                  onClick={() => navigate('/subscription')}
                  variant="outline"
                >
                  השלם את תהליך ההרשמה
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="analytics" className="mt-4">
            {loadingActivity ? (
              <div className="py-8 flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-2 text-muted-foreground">טוען נתוני שימוש...</p>
              </div>
            ) : userActivity ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      סטטיסטיקות שימוש
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>כניסות למערכת:</span>
                        <span className="font-medium">{userActivity.loginCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>גיל המנוי:</span>
                        <span className="font-medium">{userActivity.subscriptionAge} ימים</span>
                      </div>
                      <div className="flex justify-between">
                        <span>כניסה אחרונה:</span>
                        <span className="font-medium">{new Date(userActivity.lastActive).toLocaleDateString('he-IL')}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-2">שימוש בתכונות</h3>
                    <div className="space-y-2">
                      {Object.entries(userActivity.featureUsage).map(([feature, count]) => (
                        <div key={feature} className="flex justify-between text-sm">
                          <span>{feature}:</span>
                          <span className="font-medium">{count} פעמים</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">היסטורית תשלומים</h3>
                  <div className="space-y-2 overflow-auto max-h-40">
                    {userActivity.paymentHistory.length > 0 ? (
                      userActivity.paymentHistory.map((payment: any, index: number) => (
                        <div key={index} className="flex justify-between text-sm py-1 border-b border-muted last:border-0">
                          <span>{new Date(payment.date).toLocaleDateString('he-IL')}</span>
                          <span className="font-medium">
                            {payment.amount} {payment.currency}
                          </span>
                          <span className={payment.status === 'completed' ? 'text-green-500' : ''}>
                            {payment.status === 'completed' ? 'נפרע' : payment.status}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center text-sm">אין היסטורית תשלומים</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center">
                <p className="text-muted-foreground">לא נמצאו נתונים</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </>
      <SubscriptionFooter planType={subscription.plan_type} />
    </SubscriptionCard>
  );
};

export default UserSubscription;
