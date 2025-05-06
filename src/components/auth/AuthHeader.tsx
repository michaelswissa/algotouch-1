
import React from 'react';
import TraderVueLogo from "@/components/TraderVueLogo";

interface AuthHeaderProps {
  title?: string;
  subtitle?: string;
}

const AuthHeader: React.FC<AuthHeaderProps> = ({ 
  title = "ברוכים הבאים ל-AlgoTouch",
  subtitle
}) => {
  return (
    <div className="flex flex-col items-center justify-center space-y-2 text-center">
      <TraderVueLogo className="h-16 w-auto mb-4" />
      <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
        {title}
      </h1>
      {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
    </div>
  );
};

export default AuthHeader;
