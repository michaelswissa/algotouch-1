
import React from 'react';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import PlanDetailsSummary from './PlanDisplay';

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
    <CardHeader className="relative bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-950 pb-8 border-b border-primary/20 overflow-hidden">
      {/* Subtle background pattern effect */}
      <div className="absolute inset-0 opacity-5 background-noise"></div>
      
      {/* Decorative glow effect */}
      <div className="absolute -top-40 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
      
      {/* Header content */}
      <div className="relative">
        <div className="flex items-center gap-4 mb-5 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-md"></div>
            <div className="relative bg-gradient-to-br from-primary/20 to-primary/10 p-3 rounded-full shadow-xl ring-1 ring-primary/30 backdrop-blur-sm">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-2xl font-bold tracking-wider text-white">השלם את התשלום</CardTitle>
            <CardDescription className="text-base mt-2 text-slate-300/90 leading-relaxed">
              אנא מלא את פרטי התשלום במערכת הסליקה המאובטחת
            </CardDescription>
          </div>
        </div>
      </div>
      
      {/* Premium Plan Summary Box with modern design */}
      <PlanDetailsSummary planDetails={planDetails} isMonthlyPlan={isMonthlyPlan} />
    </CardHeader>
  );
};

export default PaymentSectionHeader;
