
import React, { useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/auth';
import AuthHeader from '@/components/auth/AuthHeader';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';

const Auth = () => {
  const { isAuthenticated, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();

  // Get initial tab from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'signup') {
      setActiveTab('signup');
    }
  }, [location]);

  // Check if there's registration data in session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      // If registration is in progress, redirect to subscription page
      window.location.href = '/subscription';
    }
  }, []);

  // If user is already authenticated, redirect to dashboard
  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-background/90 p-4" dir="rtl">
      <div className="w-full max-w-md space-y-6">
        <AuthHeader />
        
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'login' | 'signup')}>
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="signup">הרשמה</TabsTrigger>
            <TabsTrigger value="login">התחברות</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm />
          </TabsContent>
          
          <TabsContent value="signup">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auth;
