
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket, Diamond, Crown } from 'lucide-react';
import PlanFeaturesList from './PlanFeaturesList';
import PlanPricing from './PlanPricing';
import { PlanFeatureProps } from './PlanFeature';

export interface PlanProps {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  description: string;
  icon: React.ReactNode;
  features: PlanFeatureProps[];
  hasTrial?: boolean;
  recommended?: boolean;
  onSelect: (planId: string) => void;
  isSelected: boolean;
}

const PlanCard: React.FC<PlanProps> = ({
  id,
  name,
  price,
  currency,
  billingPeriod,
  description,
  features,
  hasTrial,
  recommended,
  onSelect,
  isSelected
}) => {
  // Get color variables based on plan type
  const getColor = () => {
    if (id === 'monthly') return '#9f7aea'; // Purple for monthly
    if (id === 'annual') return '#3b82f6'; // Blue for annual
    return '#f59e0b'; // Amber for VIP
  };
  
  // Get the appropriate icon based on plan ID with consistent styling
  const getPlanIcon = () => {
    const color = getColor();
    if (id === 'monthly') return <Rocket className="h-6 w-6" style={{ color }} />;
    if (id === 'annual') return <Diamond className="h-6 w-6" style={{ color }} />;
    return <Crown className="h-6 w-6" style={{ color }} />;
  };

  // Get the badge for each plan with consistent color scheme
  const getPlanBadge = () => {
    if (id === 'monthly') return <Badge className="bg-purple-500 hover:bg-purple-600">חודש חינם</Badge>;
    if (id === 'annual') return <Badge className="bg-blue-500 hover:bg-blue-600">חיסכון שנתי</Badge>;
    if (id === 'vip') return <Badge className="bg-amber-500 hover:bg-amber-600">VIP</Badge>;
    return null;
  };

  // Get background colors for icon container
  const getIconBackground = () => {
    if (id === 'monthly') return 'bg-purple-100 dark:bg-purple-900/20';
    if (id === 'annual') return 'bg-blue-100 dark:bg-blue-900/20';
    return 'bg-amber-100 dark:bg-amber-900/20';
  };

  return (
    <Card 
      className={`overflow-hidden transition-all duration-300 hover:shadow-lg h-full flex flex-col ${
        isSelected 
          ? `border-2 ring-2 animate-pulse-subtle ${
              id === 'monthly' 
                ? 'border-purple-500 ring-purple-500/30' 
                : id === 'annual' 
                  ? 'border-blue-500 ring-blue-500/30' 
                  : 'border-amber-500 ring-amber-500/30'
            }` 
          : 'hover:-translate-y-1 border'
      }`}
    >
      <CardHeader className="pb-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`rounded-full p-2 ${getIconBackground()} ${isSelected ? 'animate-pulse' : 'animate-float'}`}>
              {getPlanIcon()}
            </div>
            <CardTitle className="text-xl">{name}</CardTitle>
          </div>
          <div className="transition-all duration-300 hover:scale-110">
            {getPlanBadge()}
          </div>
        </div>
        <CardDescription className="text-sm mt-2">{description}</CardDescription>
        <PlanPricing 
          price={price} 
          currency={currency} 
          billingPeriod={billingPeriod}
          planId={id}
        />
      </CardHeader>
      <CardContent className="py-4 flex-grow">
        <PlanFeaturesList features={features} planId={id} />
      </CardContent>
      <CardFooter className="pt-4 pb-6 mt-auto">
        <Button 
          className={`w-full text-base py-6 transition-all duration-300 ${
            isSelected 
              ? 'scale-[1.02] ' + (
                id === 'monthly' 
                  ? 'shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                  : id === 'annual' 
                    ? 'shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                    : 'shadow-[0_0_15px_rgba(245,158,11,0.5)]'
              )
              : 'hover:scale-105 hover:shadow-md'
          }`}
          size="default"
          variant={isSelected ? "default" : "outline"}
          onClick={() => onSelect(id)}
          style={{
            backgroundColor: isSelected 
              ? id === 'monthly' 
                ? 'var(--purple-color, #9f7aea)' 
                : id === 'annual' 
                  ? 'var(--blue-color, #3b82f6)' 
                  : 'var(--amber-color, #f59e0b)'
              : '',
            borderColor: !isSelected 
              ? id === 'monthly' 
                ? 'var(--purple-color, #9f7aea)' 
                : id === 'annual'
                  ? 'var(--blue-color, #3b82f6)'
                  : 'var(--amber-color, #f59e0b)'
              : ''
          }}
        >
          {isSelected ? 'נבחר' : 'בחר תכנית'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlanCard;
