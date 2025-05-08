
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Spinner } from '@/components/ui/spinner';
import { useSubscription } from '@/hooks/useSubscription';

const CardcomRedirectPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyPayment } = useSubscription();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Extract transaction info from URL parameters
        const lowProfileId = searchParams.get('LowProfileId');
        
        if (lowProfileId) {
          console.log('Payment redirect detected with LowProfileId:', lowProfileId);
          
          // Call your verification function
          await verifyPayment(lowProfileId);
          
          // Redirect to success page
          navigate('/my-subscription', { replace: true });
        } else {
          console.error('Missing LowProfileId in redirect URL');
          navigate('/subscription', { replace: true });
        }
      } catch (error) {
        console.error('Error handling payment redirect:', error);
        navigate('/subscription?error=payment-failed', { replace: true });
      }
    };

    handleRedirect();
  }, [searchParams, navigate, verifyPayment]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Spinner size="lg" />
      <p className="mt-4 text-lg">מעבד את התשלום...</p>
      <p className="text-muted-foreground">אנא המתן, אתה מועבר לעמוד המנוי</p>
    </div>
  );
};

export default CardcomRedirectPage;
