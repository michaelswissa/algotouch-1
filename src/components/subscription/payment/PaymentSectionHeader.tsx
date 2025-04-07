
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
    <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-8 border-b border-primary/10">
      <div className="flex items-center gap-3 mb-2">
        <div className="bg-primary/10 p-2 rounded-full">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-tight">השלם את התשלום</CardTitle>
      </div>
      <CardDescription className="text-base mt-2 text-muted-foreground/90">
        אנא מלא את פרטי התשלום במערכת הסליקה המאובטחת
      </CardDescription>
      
      {/* Enhanced Plan Summary Box with premium design */}
      <div className="mt-8 rounded-xl overflow-hidden shadow-lg border border-primary/20">
        {/* Header with subtle gradient background */}
        <div className="bg-gradient-to-r from-primary/15 to-transparent p-5 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold tracking-tight">{planDetails.name}</h3>
              {isMonthlyPlan && (
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 px-3 py-1 flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" />
                    <span className="font-medium">30 ימים חינם!</span>
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Price tag with floating effect */}
            <div className="bg-primary/5 backdrop-blur-sm border border-primary/15 p-4 rounded-xl shadow-sm">
              <div className="text-3xl font-black text-primary tracking-tight">{planDetails.price}</div>
              <div className="text-xs text-muted-foreground text-center mt-1">{isMonthlyPlan ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}</div>
            </div>
          </div>
        </div>
        
        {/* Plan features and benefits */}
        <div className="bg-card p-5">
          <p className="text-sm font-medium mb-4 text-muted-foreground/90 leading-relaxed">{planDetails.description}</p>
          
          {/* Key benefits with icons */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
            <PlanFeature text="גישה מלאה לכל התכנים" />
            <PlanFeature text="תמיכה טכנית 24/7" />
            <PlanFeature text="ביטול בכל עת" />
          </div>
          
          {/* Payment schedule info with animation */}
          <div className="flex items-center gap-2 mt-3 bg-primary/5 px-4 py-2.5 rounded-full w-fit border border-primary/15">
            {isMonthlyPlan ? (
              <>
                <Gift className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium leading-relaxed">{planDetails.info}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium leading-relaxed">{planDetails.info}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

const PlanFeature = ({ text }: { text: string }) => (
  <div className="flex items-center bg-primary/5 p-3 rounded-lg border border-primary/10">
    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
    <span className="text-sm leading-relaxed">{text}</span>
  </div>
);

import { CheckCircle } from 'lucide-react';

export default PaymentSectionHeader;
