
import { useTheme as useNextThemes } from 'next-themes';

// Export the hook with the same interface as our previous custom hook
// but now it's directly using next-themes
export const useTheme = () => {
  const { theme, setTheme, resolvedTheme } = useNextThemes();
  
  // Always return dark theme to ensure consistency
  return { 
    theme: 'dark', 
    setTheme: () => {}, // No-op function since we're forcing dark mode
    resolvedTheme: 'dark'
  };
};

export default useTheme;
