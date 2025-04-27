
import React from 'react';
import { Check } from 'lucide-react';

interface PlanFeaturesProps {
  features: string[];
}

const PlanFeatures: React.FC<PlanFeaturesProps> = ({ features }) => {
  if (!features || features.length === 0) return null;
  
  return (
    <div className="mt-6">
      <ul className="space-y-2">
        {features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 mr-2 text-primary flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PlanFeatures;
