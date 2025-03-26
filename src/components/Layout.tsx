
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
      <main className={cn("flex-1 overflow-y-auto p-2 animate-fade-in bg-main-background bg-cover bg-center bg-no-repeat", className)}>
        <div className="rounded-lg glass-card min-h-full p-4 backdrop-blur-md bg-background/60 shadow-lg border border-white/5">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
