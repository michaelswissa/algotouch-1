
import React from 'react';
import { Outlet } from 'react-router-dom';
import { Toaster } from "sonner";
import { AuthProvider } from '@/contexts/auth';
import { AdminProvider } from '@/contexts/admin';
import { SidebarProvider } from '@/contexts/sidebar';

const RootLayout: React.FC = () => {
  return (
    <AuthProvider>
      <AdminProvider>
        <SidebarProvider>
          <Outlet />
          <Toaster expand={true} position="top-center" richColors />
        </SidebarProvider>
      </AdminProvider>
    </AuthProvider>
  );
};

export default RootLayout;
