
import React, { useEffect } from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout = ({ children, className }: LayoutProps) => {
  useEffect(() => {
    // Add dark class to html element
    document.documentElement.classList.add('dark');
  }, []);

  return (
    <div className="flex h-screen overflow-hidden dark:bg-background dark:text-foreground transition-all duration-300" dir="rtl">
      <Sidebar />
      <main className={cn("flex-1 overflow-y-auto p-2 animate-fade-in bg-main-background bg-cover bg-center bg-fixed bg-no-repeat relative", className)}>
        {/* Add modern background effects */}
        <div className="absolute inset-0 bg-dots opacity-30 pointer-events-none"></div>
        
        {/* Add animated floating elements for 2025 design feel */}
        <div className="absolute w-32 h-32 rounded-full bg-primary/5 blur-3xl top-1/4 left-1/4 floating-element pointer-events-none"></div>
        <div className="absolute w-40 h-40 rounded-full bg-purple-500/5 blur-3xl bottom-1/4 right-1/3 sine-move pointer-events-none"></div>
        <div className="absolute w-24 h-24 rounded-full bg-blue-300/5 blur-2xl top-1/2 right-1/4 floating-element pointer-events-none" style={{ animationDelay: "2s" }}></div>
        
        {/* Main content with enhanced glass effect */}
        <div className="rounded-xl glass-card-2025 min-h-full p-4 backdrop-blur-md bg-background/60 shadow-lg z-10 relative">
          {/* Subtle neon border effect */}
          <div className="absolute inset-0 rounded-xl neon-border opacity-50 pointer-events-none"></div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
