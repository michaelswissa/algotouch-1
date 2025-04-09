
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
  
  // Effect to check for completion step in URL immediately on mount
  useEffect(() => {
    const checkUrlForCompletion = () => {
      const params = new URLSearchParams(window.location.search);
      const step = params.get('step');
      const success = params.get('success');
      const lpId = params.get('lpId');
      
      console.log('Checking URL parameters on mount:', { step, success, lpId });
      
      // If success=true is present, immediately go to completion step
      if (success === 'true') {
        console.log('Success=true detected in URL on mount, forcing completion');
        
        // Update session data
        const sessionData = sessionStorage.getItem('subscription_flow');
        if (sessionData) {
          try {
            const parsedSession = JSON.parse(sessionData);
            parsedSession.step = 'completion';
            sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
            
            // Call the completion handler immediately
            setTimeout(() => {
              console.log('Calling onPaymentComplete handler due to success=true in URL');
              toast.success('התשלום התקבל בהצלחה!');
              onPaymentComplete();
            }, 300);
          } catch (error) {
            console.error('Error parsing session data:', error);
            // Call completion handler anyway if parsing fails
            setTimeout(() => {
              onPaymentComplete();
            }, 300);
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
          }, 300);
        }
        
        // If we're in an iframe and success is detected, break out to parent
        if (window !== window.top) {
          console.log('We are in an iframe with success=true, attempting to break out');
          
          try {
            // Navigate the parent window to the completion step
            const redirectUrl = `${window.location.origin}/subscription?step=completion&success=true&plan=${selectedPlan}`;
            window.top.location.href = redirectUrl;
          } catch (e) {
            console.error('Could not navigate top window:', e);
          }
        }
      }
      
      // If explicit completion step is requested, honor it
      if (step === 'completion') {
        console.log('Explicit step=completion detected in URL');
        
        // Update session data to force completion step
        const sessionData = sessionStorage.getItem('subscription_flow');
        if (sessionData) {
          try {
            const parsedSession = JSON.parse(sessionData);
            parsedSession.step = 'completion';
            sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
          } catch (error) {
            console.error('Error updating session data:', error);
          }
        } else {
          sessionStorage.setItem('subscription_flow', JSON.stringify({
            step: 'completion',
            selectedPlan
          }));
        }
        
        // Call the completion handler
        setTimeout(() => {
          onPaymentComplete();
        }, 300);
      }
    };
    
    // Run the URL check immediately
    checkUrlForCompletion();
  }, [selectedPlan, onPaymentComplete]);
  
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
      
      // Update session data to completion
      const sessionData = sessionStorage.getItem('subscription_flow');
      if (sessionData) {
        try {
          const parsedSession = JSON.parse(sessionData);
          parsedSession.step = 'completion';
          sessionStorage.setItem('subscription_flow', JSON.stringify(parsedSession));
          
          // Notify user of success
          toast.success('התשלום התקבל בהצלחה!');
          
          // Complete payment
          setTimeout(() => {
            onPaymentComplete();
          }, 300);
        } catch (error) {
          console.error('Error updating session data:', error);
          // Still complete payment if JSON parse fails
          setTimeout(() => {
            toast.success('התשלום התקבל בהצלחה!');
            onPaymentComplete();
          }, 300);
        }
      } else {
        // No session data, still complete payment
        setTimeout(() => {
          toast.success('התשלום התקבל בהצלחה!');
          onPaymentComplete();
        }, 300);
      }
    } else if (paymentStatus.error) {
      toast.error('אירעה שגיאה בתהליך התשלום: ' + paymentStatus.errorMessage);
    }
  }, [paymentStatus, onPaymentComplete]);
  
  // Listen for storage changes to detect completion from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'subscription_flow') {
        try {
          const newData = JSON.parse(event.newValue || '{}');
          if (newData.step === 'completion') {
            console.log('Detected completion step in storage event');
            onPaymentComplete();
          }
        } catch (e) {
          console.error('Error handling storage event:', e);
        }
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [onPaymentComplete]);
  
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
