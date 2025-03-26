
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
        {/* Ultra light background pattern */}
        <div className="absolute inset-0 bg-dots opacity-3 pointer-events-none"></div>
        
        {/* Very light floating elements */}
        <div className="absolute w-40 h-40 rounded-full bg-primary/2 blur-3xl top-1/4 left-1/4 floating-element pointer-events-none"></div>
        <div className="absolute w-48 h-48 rounded-full bg-purple-400/2 blur-3xl bottom-1/4 right-1/3 sine-move pointer-events-none"></div>
        <div className="absolute w-32 h-32 rounded-full bg-blue-300/2 blur-2xl top-1/2 right-1/4 floating-element pointer-events-none" style={{ animationDelay: "2s" }}></div>
        
        {/* Main content with ultra light glass effect */}
        <div className="rounded-xl min-h-full p-6 backdrop-blur-[2px] bg-white/90 dark:bg-white/5 shadow-sm z-10 relative border border-white/20 dark:border-white/3 transition-all duration-300">
          {/* Ultra subtle neon border effect */}
          <div className="absolute inset-0 rounded-xl neon-border opacity-5 pointer-events-none"></div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
