
import React from 'react';
import SubscriptionPlans from '@/components/SubscriptionPlans';

interface PlanSelectionStepProps {
  selectedPlanId?: string;
  onSelectPlan: (planId: string) => void;
}

const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({
  selectedPlanId,
  onSelectPlan
}) => {
  return (
    <SubscriptionPlans 
      onSelectPlan={onSelectPlan} 
      selectedPlanId={selectedPlanId} 
    />
  );
};

export default PlanSelectionStep;
