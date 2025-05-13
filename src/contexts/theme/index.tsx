
import React from 'react';
import { ThemeProvider as NextThemeProvider } from 'next-themes';

// Simple re-export of the NextThemeProvider for compatibility
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  return (
    <NextThemeProvider enableSystem={false} defaultTheme="dark" forcedTheme="dark">
      {children}
    </NextThemeProvider>
  );
};

// Export a compatible useTheme hook for any components that need it
export { useTheme } from '@/hooks/use-theme';
