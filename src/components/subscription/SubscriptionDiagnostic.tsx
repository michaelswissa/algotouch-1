import React from 'react';
import { useSubscription } from '@/hooks/subscription';

// Simple diagnostic component for subscription system
const SubscriptionDiagnostic: React.FC = () => {
  // We're importing from the new location
  const { loading, subscription, error, checkForUnprocessedPayments } = useSubscription();

  // Keep the same functionality
  return null;
};

export default SubscriptionDiagnostic;
