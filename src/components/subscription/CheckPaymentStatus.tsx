
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth';
import { useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';

const CheckPaymentStatus = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState('בודק סטטוס תשלום...');

  useEffect(() => {
    const checkForPendingPayment = async () => {
      if (!user) return;
      
      setChecking(true);
      
      try {
        // Check for payment_lowProfileId in sessionStorage
        const lowProfileId = sessionStorage.getItem('payment_lowProfileId');
        
        if (lowProfileId) {
          setMessage('מאמת פרטי תשלום...');
          
          // Verify payment status
          const { data, error } = await supabase.functions.invoke('cardcom-check-status', {
            body: { lowProfileId }
          });
          
          if (error) {
            console.error('Error checking payment:', error);
            throw new Error(error.message);
          }
          
          if (data.OperationResponse === 0) {
            // Payment successful
            setMessage('התשלום אומת בהצלחה, יוצר מנוי...');
            
            // Clean up session storage
            sessionStorage.removeItem('payment_lowProfileId');
            sessionStorage.removeItem('payment_planId');
            
            // Invoke subscription sync to create/update subscription
            await supabase.functions.invoke('cardcom-subscription-sync', {
              body: { userId: user.id }
            });
            
            // Redirect to subscription page after short delay
            setTimeout(() => {
              navigate('/my-subscription', { replace: true });
            }, 1500);
          } else {
            setMessage('לא נמצא תשלום תקף, בודק פרטי מנוי...');
          }
        } else {
          // No pending payment, just redirect
          navigate('/my-subscription', { replace: true });
        }
      } catch (error) {
        console.error('Error in payment verification:', error);
        setMessage('אירעה שגיאה בבדיקת התשלום.');
        
        // Still redirect to subscription page after delay
        setTimeout(() => {
          navigate('/my-subscription', { replace: true });
        }, 2000);
      } finally {
        setChecking(false);
      }
    };
    
    checkForPendingPayment();
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <Spinner className="h-8 w-8 mb-4" />
      <p>{message}</p>
    </div>
  );
};

export default CheckPaymentStatus;
