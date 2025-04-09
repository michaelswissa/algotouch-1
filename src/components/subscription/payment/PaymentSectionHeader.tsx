
import React from 'react';
import { CardHeader } from '@/components/ui/card';
import PlanDetailsSummary from './PlanDisplay';
import { Diamond } from 'lucide-react';

interface PaymentSectionHeaderProps {
  planName: string;
  planDescription: string;
  planPrice: string;
  onBack: () => void;
}

const PaymentSectionHeader: React.FC<PaymentSectionHeaderProps> = ({ 
  planName,
  planDescription,
  planPrice,
  onBack
}) => {
  const isMonthlyPlan = planName === 'חודשי';

  return (
    <CardHeader className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 pt-6 pb-4 border-b border-primary/20" dir="rtl">
      {/* Background effects */}
      <div className="absolute inset-0 opacity-5 background-noise"></div>
      <div className="absolute -top-40 -right-20 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-40 -left-20 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl"></div>
      
      {/* Header content with improved typography and spacing */}
      <div className="relative">
        <div className="flex flex-col gap-1 mb-3 animate-fade-in">
          <h2 className="text-xl font-medium tracking-wider text-white text-right leading-relaxed">
            הזן את פרטי הכרטיס האשראי שלך לתשלום
          </h2>
          <p className="text-cyan-300 text-sm mt-1 text-right italic animate-pulse-subtle">
            צעדים אחרונים - תוכל להתחיל להשתמש תוך דקה!
          </p>
        </div>
      </div>
      
      {/* Premium plan summary with improved value proposition */}
      <PlanDetailsSummary 
        planDetails={{
          name: planName,
          price: planPrice,
          description: planDescription,
          info: isMonthlyPlan ? 'החיוב הראשון לאחר 30 יום' : 'חיוב מיידי'
        }} 
        isMonthlyPlan={isMonthlyPlan} 
      />
    </CardHeader>
  );
};

export default PaymentSectionHeader;
