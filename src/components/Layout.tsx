
import React from 'react';
import Sidebar from './Sidebar';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
  className?: string;
}

const Layout = ({ children, className }: LayoutProps) => {
  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden" dir="rtl">
      <main className={cn("flex-1 overflow-y-auto", className)}>
        {children}
      </main>
      <Sidebar />
    </div>
  );
};

export default Layout;
