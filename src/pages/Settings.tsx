
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/ui/theme-provider";
import Layout from '@/components/Layout';

const Settings = () => {
  const { theme, setTheme } = useTheme();
  
  return (
    <Layout>
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">הגדרות</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>הגדרות תצוגה</CardTitle>
              <CardDescription>התאם את מראה האפליקציה לפי העדפותיך</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">ערכת נושא</h3>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant={theme === 'light' ? 'default' : 'outline'}
                      onClick={() => setTheme('light')}
                    >
                      מצב בהיר
                    </Button>
                    <Button
                      variant={theme === 'dark' ? 'default' : 'outline'}
                      onClick={() => setTheme('dark')}
                    >
                      מצב כהה
                    </Button>
                    <Button
                      variant={theme === 'system' ? 'default' : 'outline'}
                      onClick={() => setTheme('system')}
                    >
                      ברירת מחדל
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default Settings;
