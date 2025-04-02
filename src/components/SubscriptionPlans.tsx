
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: string;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'חודשי',
    price: 99,
    billingPeriod: 'לחודש',
    description: 'תכנית בסיסית למשתמשים פרטיים',
    features: [
      { name: 'גישה לכל הקורסים', included: true },
      { name: 'יומן מסחר', included: true },
      { name: 'חודש ניסיון חינם', included: true },
      { name: 'פיצ\'רים מתקדמים', included: false },
      { name: 'תמיכה מורחבת', included: false },
    ],
  },
  {
    id: 'annual',
    name: 'שנתי',
    price: 899,
    billingPeriod: 'לשנה',
    description: 'חסכון של חודשיים בתשלום שנתי!',
    features: [
      { name: 'גישה לכל הקורסים', included: true },
      { name: 'יומן מסחר', included: true },
      { name: 'חודש ניסיון חינם', included: true },
      { name: 'פיצ\'רים מתקדמים', included: true },
      { name: 'תמיכה מורחבת', included: true },
    ],
    popular: true,
  }
];

interface SubscriptionPlansProps {
  onSelectPlan?: (planId: string) => void;
  selectedPlanId?: string;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({
  onSelectPlan,
  selectedPlanId,
}) => {
  const navigate = useNavigate();

  const handlePlanClick = (planId: string) => {
    if (onSelectPlan) {
      onSelectPlan(planId);
    } else {
      navigate(`/subscription/${planId}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-8" dir="rtl">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold">תכניות מנוי</h2>
        <p className="text-muted-foreground">בחר את התכנית המתאימה לך ביותר</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`overflow-hidden transition-all ${
              plan.popular ? 'border-primary/50 shadow-lg shadow-primary/10' : ''
            } ${selectedPlanId === plan.id ? 'border-primary ring-2 ring-primary/30' : ''}`}
          >
            {plan.popular && (
              <div className="bg-primary text-primary-foreground py-1 text-center text-sm font-medium">
                הכי פופולרי
              </div>
            )}
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">₪{plan.price}</span>
                <span className="text-muted-foreground"> {plan.billingPeriod}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <span className={`rounded-full p-1 ${feature.included ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Check className="h-4 w-4" />
                    </span>
                    <span className={feature.included ? '' : 'text-muted-foreground'}>{feature.name}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handlePlanClick(plan.id)}
              >
                {selectedPlanId === plan.id ? 'נבחר' : 'בחר תכנית'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>* כל התכניות כוללות חודש ניסיון חינם. ניתן לבטל בכל עת ללא התחייבות.</p>
        <p>* מחירים לא כוללים מע"מ.</p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
