
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
  
  // Effect to check for completion step in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const step = params.get('step');
    const success = params.get('success');
    
    console.log('Checking URL parameters:', { step, success });
    
    if (step === 'completion' && success === 'true') {
      console.log('Detected completion step with success=true in URL');
      
      // Update session data
      const sessionData = sessionStorage.getItem('subscription_flow');
      if (sessionData) {
        try {
          const parsedSession = JSON.parse(sessionData);
          parsedSession.step = 'completion';
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
          
          // Call the completion handler with a slight delay
          setTimeout(() => {
            console.log('Calling onPaymentComplete handler');
            toast.success('התשלום התקבל בהצלחה!');
            onPaymentComplete();
          }, 100);
        } catch (error) {
          console.error('Error parsing session data:', error);
          // Call completion handler anyway if parsing fails
          setTimeout(() => {
            onPaymentComplete();
          }, 100);
        }
      } else {
        console.log('No session data found, creating new one');
        // Create new session data if none exists
        const newSession = {
          step: 'completion',
          selectedPlan
        };
        sessionStorage.setItem('subscription_flow', JSON.stringify(newSession));
        
        // Call completion handler
        setTimeout(() => {
          toast.success('התשלום התקבל בהצלחה!');
          onPaymentComplete();
        }, 100);
      }
    }
    
    // Also check if we're in an iframe and need to break out
    if ((step === 'completion' || success === 'true') && window !== window.top) {
      console.log('We are in an iframe with completion/success parameters, breaking out');
      
      // Try to navigate the top window
      try {
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('forceRedirect', 'true');
        window.top.location.href = currentUrl.toString();
      } catch (e) {
        console.error('Could not navigate top window:', e);
      }
    }
  }, [onPaymentComplete, selectedPlan]);
  
  // Handle payment initialization
  const { paymentUrl, initiateCardcomPayment } = usePaymentInitialization(
    selectedPlan,
    onPaymentComplete, 
    onBack, 
    setIsLoading
  );
  
  // Handle URL parameters for success/error redirects
  const paymentStatus = usePaymentUrlParams(onPaymentComplete, setIsLoading);
  
  // If payment was successful (from URL params), call onPaymentComplete directly
  useEffect(() => {
    if (paymentStatus.success === true) {
      console.log('Payment status indicates success, completing payment flow');
      toast.success('התשלום התקבל בהצלחה!');
      // Update session data to completion
      const sessionData = sessionStorage.getItem('subscription_flow');
      if (sessionData) {
        try {
          const parsedSession = JSON.parse(sessionData);
          parsedSession.step = 'completion';
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
        } catch (error) {
          console.error('Error updating session data:', error);
        }
      }
      
      setTimeout(() => {
        onPaymentComplete();
      }, 100);
    } else if (paymentStatus.error) {
      toast.error('אירעה שגיאה בתהליך התשלום: ' + paymentStatus.errorMessage);
    }
  }, [paymentStatus, onPaymentComplete]);
  
  // Determine if this is a monthly plan (with trial)
  const isMonthlyPlan = selectedPlan === 'monthly';

  // Show loading screen when initializing payment
  if (isLoading) {
    return <PaymentLoading />;
  }

  // Show error screen if payment URL couldn't be generated
  if (!paymentUrl) {
    return (
      <PaymentError 
        onRetry={initiateCardcomPayment} 
        onBack={onBack} 
      />
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card 
        className="max-w-2xl mx-auto border-primary/30 shadow-[0_10px_24px_rgba(0,0,0,0.15)] overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_-5px_rgba(0,102,255,0.2)] animate-fade-in" 
        dir="rtl"
      >
        <PaymentSectionHeader 
          selectedPlan={selectedPlan} 
          getPlanDetails={() => getPlanDetails(selectedPlan)} 
        />
        
        <PaymentIframe paymentUrl={paymentUrl} />
        
        <PaymentSectionFooter 
          isLoading={isLoading} 
          isMonthlyPlan={isMonthlyPlan} 
          onBack={onBack} 
        />
      </Card>
    </div>
  );
};

export default PaymentSection;
