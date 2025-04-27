
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PlanCard from './subscription/PlanCard';
import { getPlansData } from './subscription/planData';

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: number) => void;
  selectedPlanId?: number;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSelectPlan,
  selectedPlanId,
}) => {
  const navigate = useNavigate();
  const plans = getPlansData();

  const handlePlanClick = (planId: string) => {
    if (onSelectPlan) {
      // Convert the string planId to number for compatibility
      onSelectPlan(Number(planId));
    } else {
      navigate(`/subscription/${planId}`);
    }
  };

  return (
    <div className="mx-auto max-w-6xl h-full flex flex-col justify-center" dir="rtl">
      <div className="flex justify-center mb-8">
        <h2 className="text-3xl font-bold">🚀 בחר את המסלול שהכי מתאים לך</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        {plans.map((plan) => (
          <PlanCard 
            key={plan.id}
            {...plan}
            onSelect={handlePlanClick}
            isSelected={selectedPlanId === Number(plan.id)}
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
