
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Check, Rocket, Diamond, Crown } from 'lucide-react';

interface PlanFeature {
  name: string;
  included: boolean;
  icon?: string;
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
  hasTrial?: boolean;
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: '💼 מסלול חודשי',
    price: 99,
    currency: '$',
    billingPeriod: 'לחודש',
    description: '🔓 ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
    icon: <Rocket className="h-5 w-5 text-primary" />,
    features: [
      { name: '🎁 חודש ראשון חינם – קודם תראה שהכל עובד, אחר כך תשלם.', included: true },
      { name: '💡 מדריך הפעלה ברור ומדוייק – בלי למידה מורכבת, כל מה שצריך לדעת כדי להתחיל לעבוד.', included: true },
      { name: '🤖 עוזר אישי AI זמין 24/7 – תקבל הכוונה מדויקת, תובנות חכמות ותמיכה מיידית בכל מה שקשור למסחר ושוק ההון.', included: true },
      { name: '🧠 בלוג מקצועי – מאמרים, סקירות עומק ועדכונים בזמן אמת שיעזרו לך לקבל החלטות טובות יותר.', included: true },
      { name: '👥 קהילה סגורה – מקום לשאול, ללמוד ולהישאר מעודכן עם סוחרים שחיים את השוק כמוך.', included: true },
      { name: '📈 מערכת ניתוח ביצועים – זיהוי נקודות חולשה, חוזקות והזדמנויות לשיפור המסחר שלך.', included: true },
      { name: '📓 יומן מסחר דיגיטלי + תובנות AI – מעקב אחרי ביצועים ותובנות סטטיסטיות.', included: true },
      { name: '🎓 קורסים משלימים במתנה – היכרות עם חוזים עתידיים + שליטה מלאה במערכת TradeStation.', included: true },
      { name: '💵 הטבה של 300$ בעמלות – למצטרפים חדשים בלבד.', included: true },
    ],
    hasTrial: true,
  },
  {
    id: 'annual',
    name: '💎 מסלול שנתי',
    price: 899,
    currency: '$',
    billingPeriod: 'לשנה',
    description: '📈 למי שמבין את הערך שאנחנו מביאים – זו החבילה המשתלמת ביותר.',
    icon: <Diamond className="h-5 w-5 text-primary" />,
    features: [
      { name: '🧰 כל הפיצ\'רים מהמסלול החודשי – בלי יוצא מן הכלל.', included: true },
      { name: '🧪 גישה מוקדמת (Beta) – בדוק ראשון את הפיצ\'רים החדשים, לפני כולם.', included: true },
      { name: '⚡ תמיכה מועדפת בווטסאפ – עונים לך מהר יותר, ברור יותר, אישי יותר.', included: true },
      { name: '💸 חיסכון משמעותי – חוסך כ-300$ בשנה.', included: true },
      { name: '🔁 רצף עבודה שנתי – בלי הפרעות, בלי התנתקויות, בלי לאבד מומנטום.', included: true },
    ],
    hasTrial: false,
  },
  {
    id: 'vip',
    name: '👑 מסלול VIP',
    price: 3499,
    currency: '$',
    billingPeriod: 'לכל החיים',
    description: 'מיועד לסוחרים שמכוונים גבוה במיוחד ומחפשים יתרון משמעותי בשוק.',
    icon: <Crown className="h-5 w-5 text-amber-500" />,
    features: [
      { name: '🌟 כל הפיצ\'רים מהמסלול השנתי – כולל תמיכה מועדפת וגישה מוקדמת לפיצ\'רים החדשים.', included: true },
      { name: '♾️ גישה בלתי מוגבלת – כל מה שהמערכת מציעה, פתוח עבורך תמיד.', included: true },
      { name: '🎯 ליווי אישי בזום – שיחות עם מומחים שצוללים איתך לעומק, מנתחים את התיק שלך ועוזרים לך לחדד מהלכים ולמקסם תוצאות.', included: true },
      { name: '📊 הכוונה מקצועית לפיתוח קריירה בשוק ההון – כולל בניית מסלול אישי, מיפוי מטרות, חיבורים נכונים וצמיחה מתמשכת בתעשייה.', included: true },
      { name: '🔑 אירועי VIP וקבוצות Mastermind – נטוורקינג איכותי, שיתופי פעולה ולמידה ממיטב הסוחרים בתחום.', included: true },
    ],
    hasTrial: false,
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
        <h2 className="text-3xl font-bold">🚀 בחר את המסלול שהכי מתאים לך</h2>
        <p className="text-muted-foreground">התחל עם חודש ניסיון מתנה במסלול החודשי, ללא התחייבות</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`overflow-hidden transition-all ${
              selectedPlanId === plan.id ? 'border-primary ring-2 ring-primary/30' : ''
            }`}
          >
            <CardHeader>
              <div className="flex items-center gap-2 mb-2">
                {plan.icon}
                <CardTitle>{plan.name}</CardTitle>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-2">
                <span className="text-3xl font-bold">{plan.currency}{plan.price}</span>
                <span className="text-muted-foreground"> {plan.billingPeriod}</span>
                {plan.hasTrial && <div className="text-sm text-primary font-medium mt-1">חודש ניסיון מתנה</div>}
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-2">
                <h4 className="font-medium">✔️ מה {plan.id === 'monthly' ? 'תקבל' : 'כלול'}?</h4>
              </div>
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
              <div className="mt-4 text-sm text-muted-foreground">
                למי זה מתאים? {plan.id === 'monthly' 
                  ? 'לסוחרים שרוצים חופש וגמישות מלאה, ללא התחייבות ארוכת טווח.' 
                  : plan.id === 'annual' 
                    ? 'לסוחרים שרוצים ליהנות מהנחה משמעותית ולשמור על רצף שימוש בלי לדאוג לחיובים חודשיים.' 
                    : 'למי שרוצה את הרמה הגבוהה ביותר של תמיכה, ידע ויכולות, ולסוחרים שרוצים לפתח קריירה בתחום.'}
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full" 
                variant={selectedPlanId === plan.id ? "default" : "outline"}
                onClick={() => handlePlanClick(plan.id)}
              >
                {selectedPlanId === plan.id ? 'נבחר' : 'בחר תכנית'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
      
      <div className="text-center text-sm text-muted-foreground mt-8">
        <p>* המסלול החודשי כולל חודש ניסיון חינם. ניתן לבטל בכל עת ללא התחייבות.</p>
      </div>
    </div>
  );
};

export default SubscriptionPlans;
