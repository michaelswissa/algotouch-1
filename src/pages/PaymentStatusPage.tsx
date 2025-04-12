
import React from 'react';
import Layout from '@/components/Layout';
import PaymentStatus from '@/components/payment/PaymentStatus';

const PaymentStatusPage = () => {
  return (
    <Layout className="py-8" hideSidebar>
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">סטטוס תשלום</h1>
          <p className="text-muted-foreground">מידע על התשלום שביצעת</p>
        </div>
        
        <PaymentStatus redirectOnSuccess="/my-subscription" />
      </div>
    </Layout>
  );
};

export default PaymentStatusPage;
