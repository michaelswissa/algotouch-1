
import React from 'react';

// This file now just re-exports from hooks/use-theme.ts for compatibility
// We're not creating our own ThemeProvider anymore, using next-themes from main.tsx
export { useTheme } from '@/hooks/use-theme';

// For backward compatibility, provide a no-op ThemeProvider
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
