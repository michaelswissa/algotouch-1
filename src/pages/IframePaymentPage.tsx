
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
  
  // בדיקה אם הגענו מהפניה של קארדקום בטעינת הדף
  useEffect(() => {
    if (location.search) {
      const redirectParams = CardComService.handleRedirectParameters(searchParams);
      
      // אם זוהה סטטוס הצלחה, נפנה את המשתמש לדף ההצלחה
      if (redirectParams.status === 'success') {
        PaymentLogger.log('Success status detected from URL parameters, redirecting to success page');
        navigate('/subscription/success' + location.search, { replace: true });
      } 
      // אם זוהה סטטוס כישלון, נישאר בדף התשלום והקומפוננטה תציג שגיאה
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
