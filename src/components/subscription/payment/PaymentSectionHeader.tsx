
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
    <CardHeader className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 pb-6 border-b border-primary/20">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-5 background-noise"></div>
      <div className="absolute -top-40 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
      
      {/* Header content */}
      <div className="relative">
        <div className="flex flex-col gap-1 mb-5 animate-fade-in">
          <h2 className="text-xl font-bold tracking-wider text-white text-right">הזן את פרטי הכרטיס האשראי שלך לתשלום</h2>
          <p className="text-slate-400 text-sm text-right">בחרת במסלול {planDetails.name}</p>
        </div>
      </div>
      
      {/* Enhanced plan summary box with improved styling */}
      <PlanDetailsSummary planDetails={planDetails} isMonthlyPlan={isMonthlyPlan} />
    </CardHeader>
  );
};

export default PaymentSectionHeader;
