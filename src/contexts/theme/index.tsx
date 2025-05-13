
// This file provides compatibility with the old ThemeProvider system
// while using next-themes under the hood
import React from 'react';

// Re-export the hook
export { useTheme } from '@/hooks/use-theme';

// For backward compatibility, we just pass children through
// since the actual ThemeProvider is now in main.tsx
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Simply render the children without using any hooks
  return <>{children}</>;
};
