
import React from 'react';
import SubscriptionPlans from '@/components/SubscriptionPlans';

interface PlanSelectionViewProps {
  onPlanSelect: (plan: string) => void;
  selectedPlan: string;
}

const PlanSelectionView: React.FC<PlanSelectionViewProps> = ({ 
  onPlanSelect, 
  selectedPlan 
}) => {
  return (
    <div>
      <SubscriptionPlans 
        onSelectPlan={onPlanSelect} 
        selectedPlanId={selectedPlan} 
      />
    </div>
  );
};

export default PlanSelectionView;
