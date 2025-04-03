
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Crown, Rocket, Diamond } from 'lucide-react';

interface PlanFeature {
  name: string;
  included: boolean;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingPeriod: string;
  description: string;
  icon: React.ReactNode;
  features: PlanFeature[];
  popular?: boolean;
  recommended?: boolean;
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'מסלול חודשי',
    price: 99,
    currency: '$',
    billingPeriod: 'לחודש',
    description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות',
    icon: <Rocket className="h-5 w-5 text-primary" />,
    features: [
      { name: 'חודש ראשון חינם', included: true },
      { name: 'מדריך הפעלה ברור ומדוייק', included: true },
      { name: 'עוזר אישי AI זמין 24/7', included: true },
      { name: 'בלוג מקצועי', included: true },
      { name: 'קהילה סגורה', included: true },
      { name: 'מערכת ניתוח ביצועים', included: true },
      { name: 'יומן מסחר דיגיטלי + תובנות AI', included: true },
      { name: 'קורסים משלימים במתנה', included: true },
      { name: 'הטבה של 300$ בעמלות', included: true },
    ],
  },
  {
    id: 'annual',
    name: 'מסלול שנתי',
    price: 899,
    currency: '$',
    billingPeriod: 'לשנה',
    description: '25% הנחה + שלושה חודשים מתנה',
    icon: <Diamond className="h-5 w-5 text-primary" />,
    features: [
      { name: 'כל הפיצ\'רים מהמסלול החודשי', included: true },
      { name: 'גישה מוקדמת (Beta) לפיצ\'רים חדשים', included: true },
      { name: 'תמיכה מועדפת בווטסאפ', included: true },
      { name: 'חיסכון משמעותי - כ-300$ בשנה', included: true },
      { name: 'רצף עבודה שנתי', included: true },
    ],
    popular: true,
    recommended: true,
  },
  {
    id: 'vip',
    name: 'מסלול VIP',
    price: 3499,
    currency: '$',
    billingPeriod: 'לכל החיים',
    description: 'גישה לכל החיים בתשלום חד פעמי',
    icon: <Crown className="h-5 w-5 text-amber-500" />,
    features: [
      { name: 'כל הפיצ\'רים מהמסלול השנתי', included: true },
      { name: 'גישה בלתי מוגבלת לכל הכלים', included: true },
      { name: 'ליווי אישי בזום', included: true },
      { name: 'הכוונה מקצועית לפיתוח קריירה', included: true },
      { name: 'אירועי VIP וקבוצות Mastermind', included: true },
    ],
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
        <h2 className="text-3xl font-bold">בחר את המסלול שהכי מתאים לך</h2>
        <p className="text-muted-foreground">התחל עם חודש ניסיון מתנה, ללא התחייבות</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`overflow-hidden transition-all ${
              plan.recommended ? 'border-primary/50 shadow-lg shadow-primary/10' : ''
            } ${selectedPlanId === plan.id ? 'border-primary ring-2 ring-primary/30' : ''}`}
          >
            {plan.popular && (
              <div className="bg-primary text-primary-foreground py-1 text-center text-sm font-medium">
                המסלול המומלץ
              </div>
            )}
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                {plan.icon}
                <CardTitle>{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.currency}{plan.price}</span>
                <span className="text-muted-foreground"> {plan.billingPeriod}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className={`mt-0.5 rounded-full p-1 ${feature.included ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
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
                variant={plan.recommended ? "default" : "outline"}
                onClick={() => handlePlanClick(plan.id)}
              >
                {selectedPlanId === plan.id ? 'נבחר' : 'בחר תכנית'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>* כל התכניות (חודשי ושנתי) כוללות חודש ניסיון חינם. ניתן לבטל בכל עת ללא התחייבות.</p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
