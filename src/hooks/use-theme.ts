
import { useTheme as useNextThemes } from 'next-themes';

// Export the hook with the same interface as our previous custom hook
export const useTheme = () => {
  const { theme, setTheme, resolvedTheme } = useNextThemes();
  
  return { 
    theme, 
    setTheme,
    resolvedTheme 
  };
};

export default useTheme;
