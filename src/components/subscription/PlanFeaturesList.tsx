
import React from 'react';
import PlanFeature, { PlanFeatureProps } from './PlanFeature';

interface PlanFeaturesListProps {
  features: PlanFeatureProps[];
  planId: string;
}

const PlanFeaturesList: React.FC<PlanFeaturesListProps> = ({ features, planId }) => {
  return (
    <div>
      <div className="mb-3">
        <h4 className="text-lg font-bold mb-3">מה {planId === 'monthly' ? 'תקבל' : 'כלול'}?</h4>
      </div>
      <ul className="space-y-4 text-base">
        {features.map((feature, index) => (
          <PlanFeature 
            key={index} 
            name={feature.name} 
            icon={feature.icon} 
            description={feature.description} 
            included={feature.included} 
          />
        ))}
      </ul>
    </div>
  );
};

export default PlanFeaturesList;
