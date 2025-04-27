
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePlans } from '@/hooks/usePlans';
import PlanCard from './PlanCard';
import { Skeleton } from '@/components/ui/skeleton';

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: number) => void;
  selectedPlanId?: number;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSelectPlan,
  selectedPlanId,
}) => {
  const navigate = useNavigate();
  const { data: plans, isLoading } = usePlans();

  const handlePlanClick = (planId: number) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      navigate(`/subscription/${planId}`);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-[400px] w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl h-full flex flex-col justify-center" dir="rtl">
      <div className="flex justify-center mb-8">
        <h2 className="text-3xl font-bold">🚀 בחר את המסלול שהכי מתאים לך</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {plans?.map((plan) => (
          <PlanCard 
            key={plan.id}
            id={plan.id}
            name={plan.name}
            price={plan.price}
            trialDays={plan.trial_days}
            cycleDays={plan.cycle_days}
            onSelect={handlePlanClick}
            isSelected={selectedPlanId === plan.id}
          />
        ))}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-6">
        <p>* כל התכניות (חודשי ושנתי) כוללות חודש ניסיון חינם. ניתן לבטל בכל עת ללא התחייבות.</p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
