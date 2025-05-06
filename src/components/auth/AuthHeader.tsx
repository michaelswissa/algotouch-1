
import React from 'react';
import TraderVueLogo from "@/components/TraderVueLogo";

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ 
  title = "ברוכים הבאים ל-AlgoTouch",
  subtitle = "התחבר לחשבונך או צור חשבון חדש להתחלת השימוש",
  children
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 text-center">
      <TraderVueLogo className="h-16 w-auto mb-4" />
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        {title}
      </h1>
      <p className="text-muted-foreground mb-4">{subtitle}</p>
      {children}
    </div>
  );
};

export default AuthHeader;
