
import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { CreditCard, ShieldCheck } from 'lucide-react';
import { usePaymentProcess } from './hooks/usePaymentProcess';
import PaymentErrorCard from './PaymentErrorCard';
import PaymentCardForm from './PaymentCardForm';
import ErrorRecoveryInfo from './ErrorRecoveryInfo';
import PaymentDiagnostics from './PaymentDiagnostics';

interface PaymentFormProps {
  planId: string;
  onPaymentComplete: () => void;
}

const PaymentForm: React.FC<PaymentFormProps> = ({ planId, onPaymentComplete }) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  
  const {
    isProcessing,
    registrationData,
    registrationError,
    paymentError,
    diagnosticInfo,
    loadRegistrationData,
    handleSubmit,
    handleExternalPayment,
    isRecovering,
    plan
  } = usePaymentProcess({ planId, onPaymentComplete });

  // Load registration data on component mount
  useEffect(() => {
    loadRegistrationData();
  }, []);

  // Show diagnostics if there's an error or if we've enabled it
  useEffect(() => {
    if (paymentError) {
      // Show diagnostics automatically when there's an error
      setShowDiagnostics(true);
    }
  }, [paymentError]);

  // Check for dev mode to show diagnostics
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'dev') {
      setShowDiagnostics(true);
    }
    
    // Secret key combination for diagnostics
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Shift+D to toggle diagnostics
      if (e.altKey && e.shiftKey && e.key === 'D') {
        setShowDiagnostics(prev => !prev);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If registration data is invalid, show an error and options to go back
  if (registrationError && !registrationData) {
    return <PaymentErrorCard errorMessage={registrationError} />;
  }

  const refreshDiagnostics = () => {
    window.location.reload();
  };

  return (
    <Card className="max-w-2xl mx-auto shadow-lg border-2 border-primary/20 hover-glow" dir="rtl">
      <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent pb-6 border-b">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle className="text-2xl">פרטי תשלום</CardTitle>
          </div>
          <CardDescription className="text-base">
            הזן את פרטי התשלום שלך באופן מאובטח למטה
          </CardDescription>
          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground bg-primary/10 p-2 px-3 rounded-md border border-primary/20">
            <ShieldCheck className="h-4 w-4 text-primary flex-shrink-0" />
            <span>כל פרטי התשלום מוצפנים ומאובטחים באמצעות הצפנת SSL</span>
          </div>
        </div>
      </CardHeader>
      
      {/* Display diagnostics if enabled */}
      <PaymentDiagnostics 
        diagnosticInfo={diagnosticInfo}
        onRefresh={refreshDiagnostics}
        isVisible={showDiagnostics} 
      />
      
      <ErrorRecoveryInfo 
        error={paymentError?.message}
        isRecovering={isRecovering}
      />
      
      <PaymentCardForm
        plan={plan}
        isProcessing={isProcessing}
        onSubmit={handleSubmit}
        onExternalPayment={handleExternalPayment}
        planId={planId}
      />
    </Card>
  );
};

export default PaymentForm;
