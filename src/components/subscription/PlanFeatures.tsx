
import React from 'react';
import { Check } from 'lucide-react';

interface PlanFeaturesProps {
  features: string[];
}

const PlanFeatures: React.FC<PlanFeaturesProps> = ({ features }) => {
  return (
    <ul className="space-y-2 my-6">
      {features.map((feature, index) => (
        <li key={index} className="flex items-center">
          <Check className="h-5 w-5 text-green-500 ml-2 flex-shrink-0" />
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
  );
};

export default PlanFeatures;
