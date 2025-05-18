
// This file is created to ensure backward compatibility during refactoring
// It re-exports from the new structure to match old import paths
// Remove this file once refactoring is complete

// Auth backward compatibility
export { AuthContext, AuthProvider } from '../features/auth/contexts';
export { useAuth } from '../features/auth/hooks/useAuth';

// Subscription backward compatibility
export { useSubscriptionContext, SubscriptionProvider } from '../contexts/subscription/SubscriptionContext';

// Add more re-exports as needed

// WARNING: This file is temporary and should be removed once all imports are updated
