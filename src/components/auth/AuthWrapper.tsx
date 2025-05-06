
import React, { ReactNode } from 'react';
import BeamsBackground from '@/components/BeamsBackground';

interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({ children }) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center p-4" dir="rtl">
      <BeamsBackground />
      
      <div className="w-full max-w-md space-y-6 backdrop-blur-sm bg-background/80 p-6 rounded-lg shadow-lg animate-fade-in">
        {children}
      </div>
    </div>
  );
};

export default AuthWrapper;
