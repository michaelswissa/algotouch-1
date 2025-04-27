
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import PaymentForm from '../payment/PaymentForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

interface PaymentSectionProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const PaymentSection: React.FC<PaymentSectionProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  const [isInitializing, setIsInitializing] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const { user } = useAuth();
  
  useEffect(() => {
    // Track initialization attempts to prevent infinite loops
    let initAttemptCount = 0;
    const maxInitAttempts = 2;
    const previousAttemptTime = sessionStorage.getItem('payment_init_timestamp');
    const now = Date.now();
    
    // If previous attempt was less than 5 seconds ago, wait before trying again
    if (previousAttemptTime && (now - parseInt(previousAttemptTime)) < 5000) {
      console.log('Throttling payment initialization - too many attempts');
      setInitError('יותר מדי ניסיונות לאתחול התשלום. אנא המתן רגע.');
      return;
    }
    
    // Store current initialization timestamp
    sessionStorage.setItem('payment_init_timestamp', now.toString());
    
    // Reset any previous errors
    setInitError(null);
    
    // Helper function to verify initialization integrity
    const verifyPaymentSession = async (lowProfileCode: string) => {
      try {
        // Check if this payment session already exists and has a valid status
        const { data } = await supabase.functions.invoke('cardcom-status', {
          body: {
            lowProfileCode,
            terminalNumber: '160138'
          }
        });
        
        if (data?.exists) {
          // If it exists and is completed or failed, don't try to initialize again
          console.log(`Payment session ${lowProfileCode} already processed:`, data);
          
          if (data.status === 'completed') {
            onPaymentComplete();
            toast.success('התשלום כבר בוצע בהצלחה!');
            return true;
          } else if (data.status === 'failed') {
            toast.error('התשלום נכשל, אנא נסה שנית');
          }
        }
        return false;
      } catch (error) {
        console.error('Error verifying payment session:', error);
        return false;
      }
    };
    
    // Load previous payment session if available
    const savedSession = sessionStorage.getItem('payment_session');
    if (savedSession) {
      try {
        const session = JSON.parse(savedSession);
        const age = now - session.timestamp;
        
        // If session is less than 10 minutes old, verify it before initializing a new one
        if (age < 10 * 60 * 1000 && session.lowProfileCode) {
          console.log('Found existing payment session, verifying status:', session);
          verifyPaymentSession(session.lowProfileCode);
          return;
        } else {
          // Clear expired session
          sessionStorage.removeItem('payment_session');
        }
      } catch (e) {
        console.error('Error parsing saved payment session:', e);
        sessionStorage.removeItem('payment_session');
      }
    }
  }, [planId, onPaymentComplete]);

  return (
    <div className="max-w-2xl mx-auto px-4">
      {initError ? (
        <div className="p-6 bg-red-50 border border-red-200 rounded-lg mb-4">
          <h3 className="text-lg font-medium text-red-800">שגיאה באתחול התשלום</h3>
          <p className="text-red-700 mt-2">{initError}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="secondary" 
            className="mt-4"
          >
            נסה שנית
          </Button>
        </div>
      ) : (
        <PaymentForm 
          planId={planId} 
          onPaymentComplete={onPaymentComplete} 
          onBack={onBack} 
        />
      )}
    </div>
  );
};

export default PaymentSection;
