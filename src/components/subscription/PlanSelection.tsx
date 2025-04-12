
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Check } from 'lucide-react';
import { getPlansData } from './planData';

interface PlanSelectionProps {
  onPlanSelected: (planId: string) => void;
}

const PlanSelection: React.FC<PlanSelectionProps> = ({ onPlanSelected }) => {
  const [selectedPlan, setSelectedPlan] = useState<string>('monthly');
  const plans = getPlansData();

  const handleContinue = () => {
    onPlanSelected(selectedPlan);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">בחר את המסלול המתאים לך</h2>
      
      <RadioGroup 
        value={selectedPlan} 
        onValueChange={setSelectedPlan}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {plans.map((plan) => (
          <div key={plan.id} className="relative">
            <RadioGroupItem
              value={plan.id}
              id={plan.id}
              className="peer sr-only"
            />
            <Label
              htmlFor={plan.id}
              className="flex flex-col p-6 border-2 rounded-lg cursor-pointer bg-card hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:ring-1 peer-data-[state=checked]:ring-primary h-full"
            >
              {selectedPlan === plan.id && (
                <div className="absolute top-3 right-3 text-primary">
                  <Check size={20} />
                </div>
              )}
              <div className="flex flex-col h-full">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="mt-2 text-2xl font-bold">₪{plan.price.toLocaleString()}</div>
                <div className="text-sm text-muted-foreground">{plan.billingPeriod}</div>
                
                {/* Check if plan has a display price different from actual price */}
                {plan.displayPrice && plan.displayPrice !== plan.price && (
                  <div className="mt-2 text-sm text-green-600 font-medium">
                    חיסכון של {Math.round(100 - (plan.price / (plan.price * 12/10)) * 100)}%
                  </div>
                )}
                
                <div className="mt-4 space-y-2 flex-grow">
                  {plan.features.slice(0, 3).map((feature, i) => (
                    <div key={i} className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      <span className="text-sm">{feature.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Label>
          </div>
        ))}
      </RadioGroup>

      <div className="flex justify-center mt-8">
        <Button onClick={handleContinue} className="px-8">
          המשך
        </Button>
      </div>
    </div>
  );
};

export default PlanSelection;
