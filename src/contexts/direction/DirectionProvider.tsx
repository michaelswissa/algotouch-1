
import React, { createContext, useContext, useMemo } from 'react';

type Direction = 'ltr' | 'rtl';

interface DirectionContextValue {
  dir: Direction;
}

const DirectionContext = createContext<DirectionContextValue | null>(null);

export function useDirection() {
  const context = useContext(DirectionContext);
  if (context === null) {
    throw new Error('useDirection must be used within a DirectionProvider');
  }
  return context;
}

interface DirectionProviderProps {
  dir?: Direction;
  children: React.ReactNode;
}

export function DirectionProvider({
  dir = 'rtl', // Default to RTL based on your app's Hebrew language
  children,
}: DirectionProviderProps) {
  const value = useMemo(() => ({ dir }), [dir]);
  
  return (
    <DirectionContext.Provider value={value}>
      {children}
    </DirectionContext.Provider>
  );
}
