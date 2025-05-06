
import React, { useState, useEffect, Suspense } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { Tabs } from '@/components/ui/tabs';
import AuthHeader from '@/components/auth/AuthHeader';
import TabNavigation from '@/components/auth/TabNavigation';
import AuthFormContainer from '@/components/auth/AuthFormContainer';
import LoginForm from '@/components/auth/LoginForm';
import SignupForm from '@/components/auth/SignupForm';
import { Spinner } from '@/components/ui/spinner';

interface AuthContentProps {
  redirectTo: string | null;
}

const AuthContent: React.FC<AuthContentProps> = ({ redirectTo }) => {
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const state = location.state as { 
    from?: Location, 
    redirectToSubscription?: boolean,
    isRegistering?: boolean
  };

  // Get initial tab from URL if present
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab === 'signup') {
      setActiveTab('signup');
    }
  }, [location]);

  // Check if the state specifies to show the signup tab
  useEffect(() => {
    if (state?.redirectToSubscription || state?.isRegistering) {
      setActiveTab('signup');
    }
  }, [state]);

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'login' | 'signup');
  };

  const getTabTitle = () => {
    return activeTab === 'login' ? 'התחברות' : 'הרשמה';
  };
  
  const getTabDescription = () => {
    return activeTab === 'login' ? 'הזן את פרטי ההתחברות שלך' : 'צור חשבון חדש';
  };

  return (
    <AuthHeader>
      <div className="w-full">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />
          
          <AuthFormContainer 
            activeTab={activeTab}
            getTabTitle={getTabTitle}
            getTabDescription={getTabDescription}
            loginForm={<LoginForm redirectTo={redirectTo} />}
            signupForm={<SignupForm redirectTo={redirectTo} />}
          />
        </Tabs>
      </div>
    </AuthHeader>
  );
};

export default AuthContent;
