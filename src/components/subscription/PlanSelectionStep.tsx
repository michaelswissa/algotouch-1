
import React from 'react';
import SubscriptionPlans from '@/components/SubscriptionPlans';

interface PlanSelectionStepProps {
  selectedPlanId?: string;
  onPlanSelected: (planId: string) => void;
}

const PlanSelectionStep: React.FC<PlanSelectionStepProps> = ({
  selectedPlanId,
  onPlanSelected
}) => {
  return (
    <SubscriptionPlans 
      onSelectPlan={onPlanSelected} 
      selectedPlanId={selectedPlanId} 
    />
  );
};

export default PlanSelectionStep;
