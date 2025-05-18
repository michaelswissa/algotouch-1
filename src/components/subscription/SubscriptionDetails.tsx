
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

import SubscriptionCard from './SubscriptionCard';
import SubscriptionStatus from './SubscriptionStatus';
import BillingInfo from './BillingInfo';
import PaymentMethodInfo from './PaymentMethodInfo';
import SubscriptionFooter from './SubscriptionFooter';
import ContractViewer from './ContractViewer';
import DocumentsList from './DocumentsList';

interface SubscriptionDetailsProps {
  subscription: any;
  details: any;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRefresh: () => Promise<void>;
}

const SubscriptionDetails: React.FC<SubscriptionDetailsProps> = ({ 
  subscription, 
  details, 
  activeTab, 
  setActiveTab,
  onRefresh 
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasTrial = subscription.status === 'trial' || subscription.plan_type === 'monthly';
  const hasContract = subscription.contract_signed;
  const isCancelled = subscription.status === 'cancelled';
  const billingError = !details?.nextBillingDate && subscription.status === 'active';
  
  // Create fallback details if details object is missing
  const fallbackDetails = details || {
    planName: subscription.plan_type === 'annual' ? 'שנתי' : 
              subscription.plan_type === 'vip' ? 'VIP' : 'חודשי',
    statusText: subscription.status || 'לא ידוע',
    nextBillingDate: 'לא זמין',
    planPrice: subscription.plan_type === 'annual' ? '899' : 
               subscription.plan_type === 'vip' ? '1499' : '99',
    daysLeft: 0,
    progressValue: 0,
    paymentMethod: null
  };
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success('נתוני המנוי עודכנו');
    } catch (error) {
      toast.error('שגיאה בעדכון נתוני המנוי');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <SubscriptionCard
      title={`מנוי ${fallbackDetails.planName}${isCancelled ? ' (מבוטל)' : ''}`}
      description={`סטטוס: ${fallbackDetails.statusText}`}
    >
      <>
        <div className="flex justify-end mb-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefresh} 
            disabled={isRefreshing}
            className="text-xs flex items-center gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>רענן נתונים</span>
          </Button>
        </div>
      
        <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab} className="my-2 w-full">
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="details">פרטי מנוי</TabsTrigger>
            <TabsTrigger value="contract">הסכם</TabsTrigger>
            <TabsTrigger value="documents">מסמכים</TabsTrigger>
          </TabsList>
          
          <TabsContent value="details" className="mt-4">
            {/* If subscription is cancelled, show a notice */}
            {isCancelled && (
              <Alert variant="warning" className="mb-4">
                <AlertDescription>
                  המנוי שלך בוטל ויישאר פעיל עד {fallbackDetails.nextBillingDate}.
                  לאחר מכן, לא תחויב יותר והגישה למערכת תיחסם.
                </AlertDescription>
              </Alert>
            )}
            
            {subscription.status === 'trial' && fallbackDetails && (
              <SubscriptionStatus 
                status={subscription.status} 
                daysLeft={fallbackDetails.daysLeft} 
                progressValue={fallbackDetails.progressValue} 
              />
            )}
            
            <div className="grid grid-cols-1 gap-4 mt-4">
              <BillingInfo 
                nextBillingDate={fallbackDetails.nextBillingDate} 
                planPrice={fallbackDetails.planPrice}
                currency="$"
                hasError={billingError}
              />
              
              <PaymentMethodInfo 
                paymentMethod={fallbackDetails.paymentMethod} 
              />
            </div>
          </TabsContent>
          
          <TabsContent value="contract" className="mt-4">
            {hasContract ? (
              <ContractViewer />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">לא נמצא הסכם חתום</p>
                <Button 
                  onClick={() => window.location.href = '/subscription'}
                  variant="outline"
                >
                  השלם את תהליך ההרשמה
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="documents" className="mt-4">
            {subscription && (
              <DocumentsList userId={subscription.id} />
            )}
          </TabsContent>
        </Tabs>
      </>
      <SubscriptionFooter 
        planType={subscription.plan_type} 
        endDate={subscription.current_period_ends_at}
        isCancelled={isCancelled}
      />
    </SubscriptionCard>
  );
};

export default SubscriptionDetails;
