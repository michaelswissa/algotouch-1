
/**
 * COMPATIBILITY LAYER - DO NOT USE IN NEW CODE
 * 
 * This file exists solely for backwards compatibility during refactoring.
 * All new code should import from '@/contexts/subscription/SubscriptionContext' instead.
 */

import { useSubscriptionContext, SubscriptionProvider } from '@/contexts/subscription/SubscriptionContext';

// Re-export the components and hooks from the new location
export { useSubscriptionContext, SubscriptionProvider };

// WARNING: This file will be removed once refactoring is complete
