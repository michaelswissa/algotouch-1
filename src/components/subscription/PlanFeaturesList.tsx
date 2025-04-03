
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
        <h4 className={`text-lg font-medium mb-3 pb-2 border-b ${
          planId === 'monthly' 
            ? 'border-purple-200 dark:border-purple-800' 
            : planId === 'annual' 
              ? 'border-blue-200 dark:border-blue-800' 
              : 'border-amber-200 dark:border-amber-800'
        }`}>
          יתרונות התכנית:
        </h4>
      </div>
      <ul className="space-y-3 text-base">
        {features.map((feature, index) => (
          <PlanFeature 
            key={index} 
            name={feature.name} 
            icon={feature.icon} 
            description={feature.description} 
            included={feature.included} 
            planId={planId}
          />
        ))}
      </ul>
    </div>
  );
};

export default PlanFeaturesList;
