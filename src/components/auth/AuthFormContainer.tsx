
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';

interface AuthFormContainerProps {
  activeTab: 'login' | 'signup';
  getTabTitle: () => string;
  getTabDescription: () => string;
  loginForm: React.ReactNode;
  signupForm: React.ReactNode;
}

const AuthFormContainer: React.FC<AuthFormContainerProps> = ({
  activeTab,
  getTabTitle,
  getTabDescription,
  loginForm,
  signupForm,
}) => {
  return (
    <div className="space-y-4 mt-8">
      <div className="text-right">
        <h2 className="text-2xl font-semibold">{getTabTitle()}</h2>
        <p className="text-sm text-muted-foreground">{getTabDescription()}</p>
      </div>
      
      <div className="w-full">
        <TabsContent value="login" className="mt-0">
          {loginForm}
        </TabsContent>
        <TabsContent value="signup" className="mt-0">
          {signupForm}
        </TabsContent>
      </div>
    </div>
  );
};

export default AuthFormContainer;
