
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
    <CardFooter className="flex flex-col sm:flex-row justify-between py-4 px-6 border-t border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
      <Button 
        variant="outline" 
        onClick={onBack}
        className="flex items-center gap-2 border-primary/30 hover:bg-primary/10 mb-3 sm:mb-0"
        size="sm"
      >
        <ArrowLeft className="h-4 w-4" />
        חזור
      </Button>
      
      {/* Security notice section */}
      <Alert className="flex-1 mx-0 sm:mx-4 py-2 px-3 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <AlertDescription className="text-xs font-medium">
            העסקה מאובטחת בתקן PCI DSS ומוצפנת בטכנולוגיית SSL
          </AlertDescription>
        </div>
      </Alert>
      
      {/* Start button for mobile */}
      <div className="w-full sm:hidden mt-4">
        <Button 
          size="lg"
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:opacity-90"
          disabled={isLoading}
        >
          <span>{isMonthlyPlan ? 'התחל תקופת ניסיון' : 'המשך לתשלום'}</span>
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </CardFooter>
  );
};

export default PaymentSectionFooter;
