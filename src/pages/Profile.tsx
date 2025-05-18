
import React from 'react';
import Layout from '@/components/Layout';
import UserSubscription from '@/components/UserSubscription';
import SubscriptionDiagnostic from '@/components/subscription/SubscriptionDiagnostic';

const Profile: React.FC = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-6">הפרופיל שלי</h1>
        
        {/* Display user profile information here */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          <div className="space-y-4">
            {/* Profile content would go here */}
          </div>
          
          <div>
            {/* Add diagnostic component before subscription component */}
            <SubscriptionDiagnostic />
            <UserSubscription />
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Profile;
