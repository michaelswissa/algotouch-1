
import React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlanPrice } from './PlanPrice';
import { Check } from 'lucide-react';

interface PlanCardProps {
  id: number;
  name: string;
  price: number;
  trialDays: number;
  cycleDays: number | null;
  onSelect: (id: number) => void;
  isSelected?: boolean;
}

const PlanCard: React.FC<PlanCardProps> = ({
  id,
  name,
  price,
  trialDays,
  cycleDays,
  onSelect,
  isSelected = false,
}) => {
  const isLifetime = !cycleDays;

  return (
    <Card className={`relative overflow-hidden ${
      isSelected ? 'border-primary shadow-lg' : ''
    }`}>
      {trialDays > 0 && (
        <div className="absolute top-0 left-0 right-0 bg-primary text-primary-foreground text-center py-1 text-sm">
          {trialDays} ימי ניסיון חינם
        </div>
      )}
      
      <CardHeader className="text-center pt-8">
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>
          {isLifetime ? 'תשלום חד פעמי' : `חיוב ${cycleDays === 30 ? 'חודשי' : 'שנתי'}`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="text-center">
        <div className="mb-6">
          <PlanPrice price={price} className="text-3xl font-bold justify-center" />
          {!isLifetime && <div className="text-sm text-muted-foreground mt-1">לחודש</div>}
        </div>

        <ul className="space-y-2 text-right">
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>גישה לכל התכונות</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="h-4 w-4 text-primary shrink-0" />
            <span>עדכונים שוטפים</span>
          </li>
          {isLifetime && (
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-primary shrink-0" />
              <span>גישה לכל החיים</span>
            </li>
          )}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button 
          onClick={() => onSelect(id)} 
          className="w-full"
          variant={isSelected ? "secondary" : "default"}
        >
          {isSelected ? 'נבחר' : 'בחר תכנית'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default PlanCard;
