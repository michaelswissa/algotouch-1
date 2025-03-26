
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
        {/* Modern subtle background pattern */}
        <div className="absolute inset-0 bg-dots opacity-5 pointer-events-none"></div>
        
        {/* Modern floating elements with improved animations */}
        <div className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl top-1/3 left-1/3 floating-element pointer-events-none"></div>
        <div className="absolute w-80 h-80 rounded-full bg-purple-400/10 blur-3xl bottom-1/3 right-1/4 sine-move pointer-events-none"></div>
        <div className="absolute w-64 h-64 rounded-full bg-blue-300/10 blur-2xl top-1/2 right-1/3 floating-element pointer-events-none" style={{ animationDelay: "1.5s" }}></div>
        
        {/* Modern glass effect container with enhanced depth */}
        <div className="rounded-xl min-h-full p-6 backdrop-blur-sm bg-white/90 dark:bg-white/10 shadow-lg z-10 relative border border-white/40 dark:border-white/10 transition-all duration-300">
          {/* Subtle accent border */}
          <div className="absolute inset-0 rounded-xl border border-primary/20 opacity-30 pointer-events-none"></div>
          
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
