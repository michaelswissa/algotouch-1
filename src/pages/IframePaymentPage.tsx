
import React from 'react';
import { IframePaymentSection } from '@/components/payment';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';

const IframePaymentPage: React.FC = () => {
  const { planId = 'monthly' } = useParams<{ planId: string }>();
  const navigate = useNavigate();
  
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
