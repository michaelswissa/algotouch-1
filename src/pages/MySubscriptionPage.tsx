
import React from 'react';
import Layout from '@/components/Layout';
import UserSubscription from '@/components/UserSubscription';
import SubscriptionDiagnostic from '@/components/subscription/SubscriptionDiagnostic';

const MySubscriptionPage: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">פרטי המנוי שלי</h1>
        
        {/* Add the diagnostic component before the subscription component */}
        <SubscriptionDiagnostic />
        
        <UserSubscription />
      </div>
    </Layout>
  );
};

export default MySubscriptionPage;
