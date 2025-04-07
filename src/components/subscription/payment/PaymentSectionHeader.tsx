
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, Gift, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
    <CardHeader className="bg-gradient-to-br from-slate-800/60 via-slate-900/70 to-slate-900/80 pb-8 border-b border-primary/20">
      <div className="flex items-center gap-4 mb-5">
        <div className="bg-primary/15 p-3 rounded-full shadow-lg ring-1 ring-primary/20">
          <CreditCard className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-2xl font-bold tracking-wider text-white">השלם את התשלום</CardTitle>
      </div>
      <CardDescription className="text-base mt-2 text-slate-300/90 leading-relaxed">
        אנא מלא את פרטי התשלום במערכת הסליקה המאובטחת
      </CardDescription>
      
      {/* Premium Plan Summary Box with refined design */}
      <div className="mt-8 rounded-xl overflow-hidden shadow-xl border border-primary/30 bg-slate-800/60 backdrop-blur-sm">
        {/* Header with subtle gradient background */}
        <div className="bg-gradient-to-r from-slate-700/40 to-slate-800/60 p-6 border-b border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-xl font-bold tracking-wider text-white">{planDetails.name}</h3>
              {isMonthlyPlan && (
                <div className="flex items-center gap-2 mt-3">
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 flex items-center gap-1.5">
                    <Gift className="h-3.5 w-3.5" />
                    <span className="font-medium tracking-wide">30 ימים חינם!</span>
                  </Badge>
                </div>
              )}
            </div>
            
            {/* Enhanced Price tag with floating effect */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-primary/30 p-4 rounded-xl shadow-lg transform hover:-translate-y-1 transition-transform duration-300 group">
              <div className="text-3xl font-black text-primary tracking-tighter group-hover:text-primary/90 transition-colors">{planDetails.price}</div>
              <div className="text-xs text-slate-400 text-center mt-1 font-medium">{isMonthlyPlan ? 'לאחר תקופת הניסיון' : 'סה״כ לתשלום'}</div>
            </div>
          </div>
        </div>
        
        {/* Plan features and benefits with improved spacing */}
        <div className="bg-slate-800/60 p-6">
          <p className="text-sm font-medium mb-6 text-slate-300 leading-relaxed">{planDetails.description}</p>
          
          {/* Key benefits with consistent spacing and improved design */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <PlanFeature text="גישה מלאה לכל התכנים" />
            <PlanFeature text="תמיכה טכנית 24/7" />
            <PlanFeature text="ביטול בכל עת" />
          </div>
          
          {/* Payment schedule info with refined design */}
          <div className="flex items-center gap-2.5 mt-6 bg-slate-900/50 px-4 py-3 rounded-full w-fit border border-primary/20">
            {isMonthlyPlan ? (
              <>
                <Gift className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium leading-relaxed tracking-wide text-slate-300">{planDetails.info}</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium leading-relaxed tracking-wide text-slate-300">{planDetails.info}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </CardHeader>
  );
};

const PlanFeature = ({ text }: { text: string }) => (
  <div className="flex items-center bg-slate-900/50 p-3.5 rounded-lg border border-primary/20 shadow-sm hover:border-primary/40 transition-colors duration-300">
    <CheckCircle className="h-4 w-4 text-green-400 mr-2.5 flex-shrink-0" />
    <span className="text-sm leading-relaxed font-medium text-slate-200">{text}</span>
  </div>
);

export default PaymentSectionHeader;
