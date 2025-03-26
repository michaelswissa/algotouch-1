
import React from 'react';

const TraderVueLogo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <img 
        src="https://algotouch.co.il/wp-content/uploads/2022/12/1White-Logo.svg" 
        alt="AlgoTouch Logo" 
        className="h-48 transition-all duration-300 hover:scale-105"
      />
    </div>
  );
};

export default TraderVueLogo;
