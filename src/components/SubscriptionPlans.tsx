
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Rocket, Diamond, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PlanFeature {
  name: string;
  included: boolean;
  icon: string;
  description?: string;
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
  recommended?: boolean;
}

const plans: Plan[] = [
  {
    id: 'monthly',
    name: 'מסלול חודשי',
    price: 99,
    currency: '$',
    billingPeriod: 'לחודש',
    description: 'ללא התחייבות: תתחיל, תתנסה, תחליט לפי התוצאות.',
    icon: <Rocket className="h-5 w-5 text-primary" />,
    features: [
      { name: 'חודש ראשון חינם', icon: '🎁', description: 'קודם תראה שהכל עובד, אחר כך תשלם.', included: true },
      { name: 'מדריך הפעלה ברור ומדוייק', icon: '💡', description: 'בלי למידה מורכבת, כל מה שצריך לדעת כדי להתחיל לעבוד.', included: true },
      { name: 'עוזר אישי AI זמין 24/7', icon: '🤖', description: 'תקבל הכוונה מדויקת, תובנות חכמות ותמיכה מיידית בכל מה שקשור למסחר ושוק ההון.', included: true },
      { name: 'בלוג מקצועי', icon: '🧠', description: 'מאמרים, סקירות עומק ועדכונים בזמן אמת שיעזרו לך לקבל החלטות טובות יותר.', included: true },
      { name: 'קהילה סגורה', icon: '👥', description: 'מקום לשאול, ללמוד ולהישאר מעודכן עם סוחרים שחיים את השוק כמוך.', included: true },
      { name: 'מערכת ניתוח ביצועים', icon: '📈', description: 'זיהוי נקודות חולשה, חוזקות והזדמנויות לשיפור המסחר שלך.', included: true },
      { name: 'יומן מסחר דיגיטלי + תובנות AI', icon: '📓', description: 'מעקב אחרי ביצועים ותובנות סטטיסטיות.', included: true },
      { name: 'קורסים משלימים במתנה', icon: '🎓', description: 'היכרות עם חוזים עתידיים + שליטה מלאה במערכת TradeStation.', included: true },
      { name: 'הטבה של 300$ בעמלות', icon: '💵', description: 'למצטרפים חדשים בלבד.', included: true },
    ],
    hasTrial: true,
  },
  {
    id: 'annual',
    name: 'מסלול שנתי',
    price: 899,
    currency: '$',
    billingPeriod: 'לשנה',
    description: 'למי שמבין את הערך שאנחנו מביאים – זו החבילה המשתלמת ביותר.',
    icon: <Diamond className="h-5 w-5 text-primary" />,
    features: [
      { name: 'כל הפיצ\'רים מהמסלול החודשי', icon: '🧰', description: 'בלי יוצא מן הכלל.', included: true },
      { name: 'גישה מוקדמת (Beta) לפיצ\'רים חדשים', icon: '🧪', description: 'בדוק ראשון את הפיצ\'רים החדשים, לפני כולם.', included: true },
      { name: 'תמיכה מועדפת בווטסאפ', icon: '⚡', description: 'עונים לך מהר יותר, ברור יותר, אישי יותר.', included: true },
      { name: 'חיסכון משמעותי', icon: '💸', description: 'חוסך כ-300$ בשנה.', included: true },
      { name: 'רצף עבודה שנתי', icon: '🔁', description: 'בלי הפרעות, בלי התנתקויות, בלי לאבד מומנטום.', included: true },
    ],
    hasTrial: false,
  },
  {
    id: 'vip',
    name: 'מסלול VIP',
    price: 3499,
    currency: '$',
    billingPeriod: 'לכל החיים',
    description: 'מיועד לסוחרים שמכוונים גבוה במיוחד ומחפשים יתרון משמעותי בשוק.',
    icon: <Crown className="h-5 w-5 text-amber-500" />,
    features: [
      { name: 'כל הפיצ\'רים מהמסלול השנתי', icon: '🌟', description: 'כולל תמיכה מועדפת וגישה מוקדמת לפיצ\'רים החדשים.', included: true },
      { name: 'גישה בלתי מוגבלת', icon: '♾️', description: 'כל מה שהמערכת מציעה, פתוח עבורך תמיד.', included: true },
      { name: 'ליווי אישי בזום', icon: '🎯', description: 'שיחות עם מומחים שצוללים איתך לעומק, מנתחים את התיק שלך ועוזרים לך לחדד מהלכים ולמקסם תוצאות.', included: true },
      { name: 'הכוונה מקצועית לפיתוח קריירה בשוק ההון', icon: '📊', description: 'כולל בניית מסלול אישי, מיפוי מטרות, חיבורים נכונים וצמיחה מתמשכת בתעשייה.', included: true },
      { name: 'אירועי VIP וקבוצות Mastermind', icon: '🔑', description: 'נטוורקינג איכותי, שיתופי פעולה ולמידה ממיטב הסוחרים בתחום.', included: true },
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card 
            key={plan.id} 
            className={`overflow-hidden transition-all ${
              selectedPlanId === plan.id ? 'border-primary ring-2 ring-primary/30' : ''
            } ${plan.id === 'annual' ? 'md:scale-105 z-10 relative border-blue-500 dark:border-blue-400' : ''}`}
          >
            {plan.id === 'annual' && (
              <div className="absolute inset-x-0 top-0 bg-blue-500 text-white py-1 text-center text-sm font-medium">
                המסלול המומלץ
              </div>
            )}
            <CardHeader className={`pb-4 ${plan.id === 'annual' ? 'pt-8' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {plan.id === 'monthly' && <Rocket className="h-6 w-6 text-primary" />}
                  {plan.id === 'annual' && <Diamond className="h-6 w-6 text-blue-500" />}
                  {plan.id === 'vip' && <Crown className="h-6 w-6 text-amber-500" />}
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                </div>
              </div>
              <CardDescription className="text-base">{plan.description}</CardDescription>
              <div className="mt-3 flex flex-col">
                <div className="flex items-end gap-1 mb-1">
                  <span className="text-4xl font-bold tracking-tight">{plan.currency}{plan.price}</span>
                  <span className="text-muted-foreground ml-1"> {plan.billingPeriod}</span>
                </div>
                {plan.id === 'monthly' && (
                  <div className="text-primary font-medium">
                    חודש ניסיון מתנה
                  </div>
                )}
                {plan.id === 'annual' && (
                  <div className="text-blue-500 dark:text-blue-400 font-medium">
                    25% הנחה | שלושה חודשים מתנה
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="pb-6">
              <div className="mb-3">
                <h4 className="text-lg font-bold mb-3">מה {plan.id === 'monthly' ? 'תקבל' : 'כלול'}?</h4>
              </div>
              <ul className="space-y-4 text-base">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 mt-0.5 text-lg flex items-center justify-center">
                      {feature.icon}
                    </div>
                    <div>
                      <div className="font-medium">
                        {feature.name}
                      </div>
                      {feature.description && (
                        <p className="text-muted-foreground text-sm mt-1">{feature.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-6 pt-4 border-t text-sm text-muted-foreground">
                <strong className="font-medium">למי זה מתאים?</strong> {plan.id === 'monthly' 
                  ? 'לסוחרים שרוצים חופש וגמישות מלאה, ללא התחייבות ארוכת טווח.' 
                  : plan.id === 'annual' 
                    ? 'לסוחרים שרוצים ליהנות מהנחה משמעותית ולשמור על רצף שימוש בלי לדאוג לחיובים חודשיים.' 
                    : 'למי שרוצה את הרמה הגבוהה ביותר של תמיכה, ידע ויכולות, ולסוחרים שרוצים לפתח קריירה בתחום.'}
              </div>
            </CardContent>
            <CardFooter className="pb-6 pt-0">
              <Button 
                className="w-full text-base py-6" 
                size="lg"
                variant={selectedPlanId === plan.id ? "default" : plan.id === 'annual' ? "default" : "outline"}
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
