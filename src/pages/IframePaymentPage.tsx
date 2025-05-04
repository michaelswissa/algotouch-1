
import React, { useEffect } from 'react';
import { IframePaymentSection } from '@/components/payment';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { CardComService } from '@/services/payment/CardComService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

const IframePaymentPage: React.FC = () => {
  const { planId = 'monthly' } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  
  // Check if we're receiving a redirect from CardCom when page loads
  useEffect(() => {
    if (location.search) {
      const redirectParams = CardComService.handleRedirectParameters(searchParams);
      PaymentLogger.log('Detected URL parameters in IframePaymentPage', redirectParams);
      
      // If success status is detected, redirect to success page
      if (redirectParams.status === 'success') {
        PaymentLogger.log('Success status detected from URL parameters, redirecting to success page');
        navigate('/subscription/success' + location.search, { replace: true });
      } 
      // If failed status is detected, redirect to failed page
      else if (redirectParams.status === 'failed') {
        PaymentLogger.log('Failed status detected from URL parameters, redirecting to failed page');
        navigate('/subscription/failed' + location.search, { replace: true });
      }
      // If no clear status, we'll stay on this page and the component will handle displaying errors
    }
  }, [location.search, navigate, searchParams]);
  
  const handlePaymentComplete = () => {
    navigate('/subscription/success');
  };
  
  const handleBack = () => {
    navigate(-1);
  };
  
  return (
    <Layout className="py-8" hideSidebar={true}>
      <IframePaymentSection 
        planId={planId}
        onPaymentComplete={handlePaymentComplete}
        onBack={handleBack}
      />
    </Layout>
  );
};

export default IframePaymentPage;
