
import React from 'react';

export interface PlanFeatureProps {
  name: string;
  icon: string;
  description?: string;
  included: boolean;
  planId?: string;
}

const PlanFeature: React.FC<PlanFeatureProps> = ({ 
  name, 
  icon, 
  description, 
  included,
  planId = 'monthly'
}) => {
  if (!included) return null;
  
  // Get color variables based on plan type
  const getIconColor = () => {
    if (planId === 'monthly') return 'text-purple-600 dark:text-purple-400';
    if (planId === 'annual') return 'text-blue-600 dark:text-blue-400';
    return 'text-amber-600 dark:text-amber-400';
  };
  
  const getIconBackground = () => {
    if (planId === 'monthly') return 'bg-purple-50 dark:bg-purple-900/10';
    if (planId === 'annual') return 'bg-blue-50 dark:bg-blue-900/10';
    return 'bg-amber-50 dark:bg-amber-900/10';
  };
  
  return (
    <li className="flex gap-3 group">
      <div className={`flex-shrink-0 w-8 h-8 mt-0.5 rounded-full ${getIconBackground()} ${getIconColor()} flex items-center justify-center group-hover:scale-110 transition-transform`}>
        <span role="img" aria-label={name} className="text-base">
          {icon}
        </span>
      </div>
      <div>
        <div className="font-medium">
          {name}
        </div>
        {description && (
          <p className="text-muted-foreground text-sm mt-0.5">{description}</p>
        )}
      </div>
    </li>
  );
};

export default PlanFeature;
