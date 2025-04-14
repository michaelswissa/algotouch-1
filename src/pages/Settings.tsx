
import React from 'react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/components/ui/theme-provider';
import Layout from '@/components/Layout';

const Settings = () => {
  const { theme, setTheme } = useTheme();

  return (
    <Layout>
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-4">הגדרות</h1>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold mb-2">ערכת נושא</h2>
            <div className="flex gap-4">
              <Button 
                onClick={() => setTheme('light')} 
                variant={theme === 'light' ? 'default' : 'outline'}
              >
                אור
              </Button>
              <Button 
                onClick={() => setTheme('dark')} 
                variant={theme === 'dark' ? 'default' : 'outline'}
              >
                חושך
              </Button>
              <Button 
                onClick={() => setTheme('system')} 
                variant={theme === 'system' ? 'default' : 'outline'}
              >
                מערכת
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
