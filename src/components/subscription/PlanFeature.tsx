
import React from 'react';

export interface PlanFeatureProps {
  name: string;
  icon: string;
  description?: string;
  included: boolean;
}

const PlanFeature: React.FC<PlanFeatureProps> = ({ 
  name, 
  icon, 
  description, 
  included 
}) => {
  if (!included) return null;
  
  return (
    <li className="flex gap-3">
      <div className="flex-shrink-0 w-6 h-6 mt-0.5 text-lg flex items-center justify-center">
        <span role="img" aria-label={name}>
          {icon}
        </span>
      </div>
      <div>
        <div className="font-medium">
          {name}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>
    </li>
  );
};

export default PlanFeature;
