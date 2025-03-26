
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
    <div className="flex h-screen overflow-hidden dark:bg-background dark:text-foreground bg-opacity-90" dir="rtl">
      <Sidebar />
      <main className={cn("flex-1 overflow-y-auto", className)}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
