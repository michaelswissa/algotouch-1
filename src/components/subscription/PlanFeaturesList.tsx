
import React from 'react';
import PlanFeature, { PlanFeatureProps } from './PlanFeature';

interface PlanFeaturesListProps {
  features: PlanFeatureProps[];
  planId: string;
}

const PlanFeaturesList: React.FC<PlanFeaturesListProps> = ({ features, planId }) => {
  return (
    <div>
      <div className="mb-2">
        <h4 className={`text-sm font-medium mb-2 pb-1 border-b ${
          planId === 'monthly' 
            ? 'border-purple-200 dark:border-purple-800' 
            : planId === 'annual' 
              ? 'border-blue-200 dark:border-blue-800' 
              : 'border-amber-200 dark:border-amber-800'
        }`}>
          יתרונות התכנית:
        </h4>
      </div>
      <ul className="space-y-2 text-sm">
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
