
import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import PlanPrice from './PlanPrice';
import PlanFeatures from './PlanFeatures';

export interface PlanProps {
  id: string; // Keep as string to match existing implementation
  name: string;
  description?: string;
  price: number;
  displayPrice: string;
  features: string[];
  popular?: boolean;
  cta?: string;
  hasTrial?: boolean;
  freeTrialDays?: number;
  onSelect: () => void; // Changed to callback without parameter
  isSelected?: boolean;
}

const PlanCard: React.FC<PlanProps> = ({
  id,
  name,
  description,
  price,
  displayPrice,
  features,
  popular = false,
  cta = 'בחר תוכנית',
  hasTrial = false,
  freeTrialDays = 0,
  onSelect,
  isSelected = false
}) => {
  return (
    <Card className={`relative flex flex-col h-full shadow-md ${popular ? 'border-primary shadow-primary/20' : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`}>
      {popular && (
        <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <span className="bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full font-bold">
            פופולרי
          </span>
        </div>
      )}
      
      <CardContent className="pt-6 flex-grow">
        <div className="text-center mb-4">
          <h3 className="text-xl font-bold mb-1">{name}</h3>
          {description && <p className="text-muted-foreground text-sm">{description}</p>}
        </div>
        
        <PlanPrice 
          price={price} 
          displayPrice={displayPrice} 
          hasTrial={hasTrial}
          freeTrialDays={freeTrialDays}  
        />
        
        <PlanFeatures features={features} />
      </CardContent>
      
      <CardFooter className="pt-0">
        <Button 
          onClick={onSelect}
          className="w-full" 
          variant={popular ? "default" : "outline"}
          size="lg"
        >
          {cta}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlanCard;
