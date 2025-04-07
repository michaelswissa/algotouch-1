
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, Gift } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

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
    <CardHeader className="bg-gradient-to-br from-primary/15 via-primary/10 to-transparent pb-8 border-b border-primary/10">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-primary/15 p-2 rounded-full shadow-sm">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-wider">השלם את התשלום</CardTitle>
      </div>
      <CardDescription className="text-base mt-2 text-muted-foreground/90 leading-relaxed">
        אנא מלא את פרטי התשלום במערכת הסליקה המאובטחת
      </CardDescription>
      
      {/* Premium Plan Summary Box with refined design */}
      <div className="mt-8 rounded-xl overflow-hidden shadow-md border border-primary/20 bg-card">
        {/* Header with subtle gradient background */}
        <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 border-b border-primary/10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-2xl font-bold tracking-wide text-foreground">{planDetails.name}</h3>
              {isMonthlyPlan && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="bg-green-500/15 text-green-600 dark:text-green-400 border border-green-500/20 px-3 py-1 flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" />
                    <span className="font-medium tracking-wide">30 ימים חינם!</span>
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Enhanced Price tag with floating effect */}
            <div className="bg-background/80 backdrop-blur-sm border border-primary/15 p-4 rounded-xl shadow-sm">
              <div className="text-3xl font-black text-primary tracking-tight">{planDetails.price}</div>
              <div className="text-xs text-muted-foreground text-center mt-1 font-medium">{isMonthlyPlan ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}</div>
            </div>
          </div>
        </div>
        
        {/* Plan features and benefits with improved spacing */}
        <div className="bg-background/50 p-6">
          <p className="text-sm font-medium mb-5 text-muted-foreground leading-relaxed">{planDetails.description}</p>
          
          {/* Key benefits with consistent spacing and improved design */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <PlanFeature text="גישה מלאה לכל התכנים" />
            <PlanFeature text="תמיכה טכנית 24/7" />
            <PlanFeature text="ביטול בכל עת" />
          </div>
          
          {/* Payment schedule info with refined design */}
          <div className="flex items-center gap-2 mt-4 bg-primary/10 px-4 py-3 rounded-full w-fit border border-primary/20">
            {isMonthlyPlan ? (
              <>
                <Gift className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium leading-relaxed tracking-wide">{planDetails.info}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium leading-relaxed tracking-wide">{planDetails.info}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

const PlanFeature = ({ text }: { text: string }) => (
  <div className="flex items-center bg-background/80 p-3 rounded-lg border border-primary/10 shadow-sm">
    <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
    <span className="text-sm leading-relaxed font-medium">{text}</span>
  </div>
);

export default PaymentSectionHeader;
