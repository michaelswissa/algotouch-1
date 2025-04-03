
import React from 'react';
import Layout from '@/components/Layout';
import UserSubscription from '@/components/UserSubscription';

const MySubscriptionPage = () => {
  return (
    <Layout className="py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">המנוי שלי</h1>
          <p className="text-muted-foreground">פרטי המנוי והחיובים שלך</p>
        </div>
        
        <UserSubscription />
      </div>
    </Layout>
  );
};

export default MySubscriptionPage;
