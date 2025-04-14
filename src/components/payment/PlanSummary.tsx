
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';

interface PlanSummaryProps {
  planName: string;
  planId: string;
  price: number;
  displayPrice: string;
  description?: string;
  hasTrial?: boolean;
  freeTrialDays?: number;
}

const PlanSummary: React.FC<PlanSummaryProps> = ({
  planName,
  planId,
  price,
  displayPrice,
  description,
  hasTrial = false,
  freeTrialDays = 0
}) => {
  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="pt-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-semibold text-lg">{planName}</h3>
            {description && <p className="text-sm text-muted-foreground">{description}</p>}
          </div>
          <div className="text-right">
            <div className="font-bold text-lg">{displayPrice}</div>
            {planId !== 'vip' && (
              <div className="text-xs text-muted-foreground">
                {planId === 'monthly' ? 'חיוב חודשי' : 'חיוב שנתי'}
              </div>
            )}
          </div>
        </div>

        {hasTrial && freeTrialDays > 0 && (
          <Badge variant="outline" className="bg-primary/10 text-primary mb-3">
            {freeTrialDays} ימי ניסיון בחינם
          </Badge>
        )}

        <div className="space-y-2 mt-3">
          {planId === 'monthly' && (
            <>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>גישה לכל התכנים</span>
              </div>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>תמיכה טכנית בסיסית</span>
              </div>
            </>
          )}

          {planId === 'annual' && (
            <>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>גישה לכל התכנים</span>
              </div>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>תמיכה טכנית מורחבת</span>
              </div>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>חיסכון של 15% לעומת תשלום חודשי</span>
              </div>
            </>
          )}

          {planId === 'vip' && (
            <>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>גישה לכל החיים לכל התכנים</span>
              </div>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>תמיכה טכנית VIP</span>
              </div>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>גישה לתכנים עתידיים</span>
              </div>
              <div className="flex items-center text-sm">
                <Check className="h-4 w-4 mr-2 text-primary" />
                <span>הטבות ייחודיות למנויי VIP</span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlanSummary;
