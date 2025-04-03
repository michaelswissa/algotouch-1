
import React from 'react';
import Layout from '@/components/Layout';
import { SubscriptionProvider } from '@/contexts/subscription/SubscriptionContext';
import SubscriptionContent from '@/components/subscription/SubscriptionContent';

// Simple wrapper component to provide context
const Subscription = () => {
  return (
    <Layout className="py-8" hideSidebar={true}>
      <SubscriptionProvider>
        <SubscriptionContent />
      </SubscriptionProvider>
    </Layout>
  );
};

export default Subscription;
