
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import PlanSummary from '@/components/payment/PlanSummary';

interface PaymentSectionHeaderProps {
  selectedPlan: string;
  getPlanDetails: () => {
    name: string;
    price: string;
    description: string;
    info: string;
  };
}

const PaymentSectionHeader: React.FC<PaymentSectionHeaderProps> = ({ 
  selectedPlan,
  getPlanDetails 
}) => {
  const planDetails = getPlanDetails();
  const isMonthlyPlan = selectedPlan === 'monthly';

  return (
    <CardHeader className="bg-gradient-to-r from-primary/20 to-primary/5 pb-6 border-b border-primary/20">
      <div className="flex items-center gap-2">
        <CreditCard className="h-6 w-6 text-primary" />
        <CardTitle className="text-2xl font-bold">השלם את התשלום</CardTitle>
      </div>
      <CardDescription className="text-base mt-1">
        אנא מלא את פרטי התשלום במערכת הסליקה המאובטחת
      </CardDescription>
      
      {/* Enhanced Plan Summary Box with premium design */}
      <div className="mt-6 rounded-lg overflow-hidden shadow-lg border-2 border-primary/30">
        {/* Header with gradient background */}
        <div className="bg-gradient-to-r from-primary/30 to-primary/10 p-4 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold">{planDetails.name}</h3>
              {isMonthlyPlan && (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="bg-green-600/20 text-green-700 dark:bg-green-500/30 dark:text-green-400 border border-green-600/30 px-3 py-1 flex items-center gap-1.5 animate-pulse-subtle">
                    <Gift className="h-3.5 w-3.5" />
                    <span>30 ימים חינם!</span>
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Price tag with floating effect */}
            <div className="bg-primary/15 border border-primary/30 p-3 rounded-lg shadow-md transform hover:scale-105 transition-transform duration-200">
              <div className="text-2xl font-black text-primary">{planDetails.price}</div>
              <div className="text-xs text-muted-foreground text-center">{isMonthlyPlan ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}</div>
            </div>
          </div>
        </div>
        
        {/* Plan features and benefits */}
        <div className="bg-gradient-to-br from-background to-primary/5 p-4">
          <p className="text-sm font-medium mb-3">{planDetails.description}</p>
          
          {/* Key benefits with icons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 mb-4">
            <PlanFeature text="גישה מלאה לכל התכנים" />
            <PlanFeature text="תמיכה טכנית 24/7" />
            <PlanFeature text="ביטול בכל עת" />
          </div>
          
          {/* Payment schedule info with animation */}
          <div className="flex items-center gap-2 mt-2 bg-primary/10 px-4 py-2 rounded-full w-fit border border-primary/20 shadow-sm">
            {isMonthlyPlan ? (
              <>
                <Gift className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">{planDetails.info}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">{planDetails.info}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

const PlanFeature = ({ text }: { text: string }) => (
  <div className="flex items-center bg-primary/10 p-2 rounded-md border border-primary/20">
    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
    <span className="text-xs">{text}</span>
  </div>
);

import { CheckCircle } from 'lucide-react';

export default PaymentSectionHeader;
