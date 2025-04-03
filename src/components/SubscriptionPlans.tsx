
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlanCard from './subscription/PlanCard';
import { getPlansData } from './subscription/planData';

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
  selectedPlanId?: string;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSelectPlan,
  selectedPlanId,
}) => {
  const navigate = useNavigate();
  const plans = getPlansData();

  const handlePlanClick = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      navigate(`/subscription/${planId}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8" dir="rtl">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">🚀 בחר את המסלול שהכי מתאים לך</h2>
        <p className="text-muted-foreground">התחל עם חודש ניסיון מתנה במסלול החודשי, ללא התחייבות</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard 
            key={plan.id}
            {...plan}
            onSelect={handlePlanClick}
            isSelected={selectedPlanId === plan.id}
          />
        ))}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>* כל התכניות (חודשי ושנתי) כוללות חודש ניסיון חינם. ניתן לבטל בכל עת ללא התחייבות.</p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
