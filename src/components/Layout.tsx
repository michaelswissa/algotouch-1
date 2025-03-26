
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
      <main className={cn("flex-1 overflow-y-auto p-4 animate-fade-in bg-main-background bg-cover bg-center bg-fixed bg-no-repeat relative", className)}>
        {/* Light background pattern */}
        <div className="absolute inset-0 bg-dots opacity-10 pointer-events-none"></div>
        
        {/* Light floating elements */}
        <div className="absolute w-64 h-64 rounded-full bg-primary/5 blur-3xl top-1/4 left-1/4 floating-element pointer-events-none"></div>
        <div className="absolute w-72 h-72 rounded-full bg-purple-400/5 blur-3xl bottom-1/4 right-1/3 sine-move pointer-events-none"></div>
        <div className="absolute w-48 h-48 rounded-full bg-blue-300/5 blur-2xl top-1/2 right-1/4 floating-element pointer-events-none" style={{ animationDelay: "2s" }}></div>
        
        {/* Main content with light glass effect */}
        <div className="rounded-xl min-h-full p-6 backdrop-blur-[2px] bg-white/95 dark:bg-white/10 shadow-sm z-10 relative border border-white/30 dark:border-white/5 transition-all duration-300">
          {/* Subtle neon border effect */}
          <div className="absolute inset-0 rounded-xl neon-border opacity-10 pointer-events-none"></div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
