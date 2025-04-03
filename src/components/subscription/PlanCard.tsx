
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
  // Get the appropriate icon based on plan ID
  const getPlanIcon = () => {
    if (id === 'monthly') return <Rocket className="h-6 w-6 text-primary" />;
    if (id === 'annual') return <Diamond className="h-6 w-6 text-blue-500" />;
    return <Crown className="h-6 w-6 text-amber-500" />;
  };

  // Get the badge for each plan
  const getPlanBadge = () => {
    if (id === 'monthly') return <Badge variant="default">חודש חינם</Badge>;
    if (id === 'annual') return <Badge className="bg-blue-500">מומלץ</Badge>;
    if (id === 'vip') return <Badge className="bg-amber-500">VIP</Badge>;
    return null;
  };

  return (
    <Card 
      className={`overflow-hidden transition-all ${
        isSelected ? 'border-primary ring-2 ring-primary/30' : ''
      } ${id === 'annual' ? 'md:scale-105 z-10 relative border-blue-500 dark:border-blue-400' : ''}`}
    >
      {id === 'annual' && (
        <div className="absolute inset-x-0 top-0 bg-blue-500 text-white py-1 text-center text-sm font-medium">
          המסלול המומלץ
        </div>
      )}
      <CardHeader className={`pb-4 ${id === 'annual' ? 'pt-8' : ''}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {getPlanIcon()}
            <CardTitle className="text-2xl">{name}</CardTitle>
          </div>
          <div>
            {getPlanBadge()}
          </div>
        </div>
        <CardDescription className="text-base">{description}</CardDescription>
        <PlanPricing 
          price={price} 
          currency={currency} 
          billingPeriod={billingPeriod}
          planId={id}
        />
      </CardHeader>
      <CardContent className="pb-6">
        <PlanFeaturesList features={features} planId={id} />
        <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
          <strong className="font-medium">למי זה מתאים?</strong> {id === 'monthly' 
            ? 'לסוחרים שרוצים חופש וגמישות מלאה, ללא התחייבות ארוכת טווח.' 
            : id === 'annual' 
              ? 'לסוחרים שרוצים ליהנות מהנחה משמעותית ולשמור על רצף שימוש בלי לדאוג לחיובים חודשיים.' 
              : 'למי שרוצה את הרמה הגבוהה ביותר של תמיכה, ידע ויכולות, ולסוחרים שרוצים לפתח קריירה בתחום.'}
        </div>
      </CardContent>
      <CardFooter className="pb-6 pt-0">
        <Button 
          className="w-full text-base py-6" 
          size="lg"
          variant={isSelected ? "default" : id === 'annual' ? "default" : "outline"}
          onClick={() => onSelect(id)}
        >
          {isSelected ? 'נבחר' : 'בחר תכנית'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlanCard;
