
import React from 'react';

interface TraderVueLogoProps {
  className?: string;
  collapsed?: boolean;
}

const TraderVueLogo = ({ className = "", collapsed = false }: TraderVueLogoProps) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <img 
        src="https://algotouch.co.il/wp-content/uploads/2022/12/1White-Logo.svg" 
        alt="AlgoTouch Logo" 
        className={`transition-all duration-300 hover:scale-105 ${collapsed ? 'h-8 w-auto' : 'h-32 w-auto'}`}
      />
    </div>
  );
};

export default TraderVueLogo;
