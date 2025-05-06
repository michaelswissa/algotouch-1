
import React from 'react';
import { TabsContent } from '@/components/ui/tabs';
import { Spinner } from '@/components/ui/spinner';
import { Suspense } from 'react';

// FormLoader component
const FormLoader = () => (
  <div className="flex justify-center items-center py-8">
    <Spinner className="h-6 w-6" />
  </div>
);

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
          <Suspense fallback={<FormLoader />}>
            {loginForm}
          </Suspense>
        </TabsContent>
        <TabsContent value="signup" className="mt-0">
          <Suspense fallback={<FormLoader />}>
            {signupForm}
          </Suspense>
        </TabsContent>
      </div>
    </div>
  );
};

export default AuthFormContainer;
