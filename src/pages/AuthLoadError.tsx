
import React from 'react';
import { Button } from '@/components/ui/button';

const AuthLoadError: React.FC = () => {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-background to-background/90 p-4 dark:bg-background dark:text-foreground" dir="rtl">
      <div className="text-center space-y-4 max-w-md">
        <h1 className="text-3xl font-bold">שגיאה בטעינת עמוד ההתחברות</h1>
        <p className="text-lg text-muted-foreground">
          אירעה שגיאה בטעינת העמוד. אנא נסה שוב מאוחר יותר.
        </p>
        <Button 
          onClick={handleRetry} 
          size="lg"
          className="mt-6"
        >
          נסה שוב
        </Button>
      </div>
    </div>
  );
};

export default AuthLoadError;
