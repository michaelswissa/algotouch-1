
import React from 'react';
import { Button } from '@/components/ui/button';
import { CardFooter } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ShieldCheck, ArrowLeft, ArrowRight } from 'lucide-react';

interface PaymentSectionFooterProps {
  isLoading: boolean;
  isMonthlyPlan: boolean;
  onBack: () => void;
}

const PaymentSectionFooter: React.FC<PaymentSectionFooterProps> = ({ 
  isLoading, 
  isMonthlyPlan, 
  onBack 
}) => {
  return (
    <CardFooter className="flex flex-col sm:flex-row justify-between py-4 px-5 border-t border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <Button 
        variant="outline" 
        onClick={onBack}
        className="flex items-center gap-2 border-primary/30 hover:bg-primary/10 mb-3 sm:mb-0 transition-all"
        size="sm"
      >
        <ArrowLeft className="h-4 w-4" />
        חזור
      </Button>
      
      {/* Security notice section - more compact */}
      <Alert className="flex-1 mx-0 sm:mx-3 py-1.5 px-2.5 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs font-medium">
            העסקה מאובטחת בתקן PCI DSS ומוצפנת בטכנולוגיית SSL
          </AlertDescription>
        </div>
      </Alert>
      
      {/* Start button for mobile - enhanced with shadow and hover effects */}
      <div className="w-full sm:hidden mt-4">
        <Button 
          size="lg"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-95 hover:scale-[1.03] shadow-[0_4px_16px_-4px_rgba(0,102,255,0.4)] transition-all group"
          disabled={isLoading}
        >
          <span>{isMonthlyPlan ? 'התחל תקופת ניסיון' : 'המשך לתשלום'}</span>
          <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </Button>
      </div>
    </CardFooter>
  );
};

export default PaymentSectionFooter;
