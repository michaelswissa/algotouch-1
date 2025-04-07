
import React from 'react';
import { CardHeader } from '@/components/ui/card';
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
    <CardHeader className="relative bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-slate-950 pb-6 border-b border-primary/20">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-5 background-noise"></div>
      <div className="absolute -top-40 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
      
      {/* Header content with new plan display */}
      <div className="relative">
        <div className="flex flex-col gap-1 mb-2 animate-fade-in">
          <h2 className="text-xl font-bold tracking-wider text-white text-right">הזן את פרטי הכרטיס האשראי שלך לתשלום</h2>
        </div>
      </div>
      
      {/* New premium plan summary box with updated styling */}
      <PlanDetailsSummary planDetails={planDetails} isMonthlyPlan={isMonthlyPlan} />
    </CardHeader>
  );
};

export default PaymentSectionHeader;
