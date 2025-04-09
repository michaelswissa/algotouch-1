
import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { usePaymentInitialization } from './hooks/usePaymentInitialization';
import { usePaymentUrlParams } from './hooks/usePaymentUrlParams';
import { getPlanDetails } from './PlanUtilities';
import PaymentSectionHeader from './PaymentSectionHeader';
import PaymentIframe from './PaymentIframe';
import PaymentSectionFooter from './PaymentSectionFooter';
import PaymentLoading from './PaymentLoading';
import PaymentError from './PaymentError';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface PaymentSectionProps {
  selectedPlan: string;
  onPaymentComplete: () => void;
  onBack: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  selectedPlan,
  onPaymentComplete,
  onBack
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const successCheckPerformed = React.useRef(false);
  
  // Initialize payment URL
  const { isLoading: isLoadingPayment, paymentUrl, initiateCardcomPayment } = usePaymentInitialization(
    selectedPlan,
    onPaymentComplete,
    onBack,
    setIsLoading
  );
  
  // Process URL parameters for payment status
  const paymentStatus = usePaymentUrlParams(onPaymentComplete, setIsLoading);
  
  // Effect to check for completion step in URL immediately on mount
  useEffect(() => {
    if (successCheckPerformed.current) return; // Only run once
    successCheckPerformed.current = true;
    
    const checkUrlForCompletion = () => {
      const params = new URLSearchParams(window.location.search);
      const step = params.get('step');
      const success = params.get('success');
      
      console.log('Initial URL parameter check on mount:', { step, success });
      
      // If success=true is present, immediately go to completion step
      if (success === 'true') {
        console.log('Success=true detected in URL on mount, forcing completion');
        
        // Update session data to force completion step
        try {
          const sessionData = sessionStorage.getItem('subscription_flow');
          const parsedSession = sessionData ? JSON.parse(sessionData) : {};
          parsedSession.step = 'completion';
          parsedSession.selectedPlan = selectedPlan;
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
          
          // Call the completion handler immediately
          setTimeout(() => {
            console.log('Calling onPaymentComplete handler due to success=true in URL');
            toast.success('התשלום התקבל בהצלחה!');
            onPaymentComplete();
          }, 300);
        } catch (error) {
          console.error('Error processing session data:', error);
          // Call completion handler anyway
          setTimeout(() => onPaymentComplete(), 300);
        }
      }
    };
    
    checkUrlForCompletion();
  }, [selectedPlan, onPaymentComplete]);

  // Show loading state
  if (isLoading || isLoadingPayment) {
    return <PaymentLoading />;
  }

  // Show error state if payment error detected
  if (paymentStatus.error) {
    return (
      <PaymentError 
        message={paymentStatus.errorMessage || 'אירעה שגיאה בתהליך התשלום'} 
        onRetry={initiateCardcomPayment}
        onBack={onBack}
      />
    );
  }

  const planDetails = getPlanDetails(selectedPlan);

  return (
    <Card className="border-primary/20 hover-glow transition-shadow duration-300 relative overflow-hidden">
      <PaymentSectionHeader 
        planName={planDetails.name} 
        planDescription={planDetails.description}
        planPrice={planDetails.price}
        onBack={onBack}
      />
      
      <PaymentIframe paymentUrl={paymentUrl} />
      
      <PaymentSectionFooter 
        planName={planDetails.name} 
        onBack={onBack} 
      />
    </Card>
  );
};

export default PaymentSection;
