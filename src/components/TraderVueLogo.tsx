
import React from 'react';

interface TraderVueLogoProps {
  className?: string;
  collapsed?: boolean;
}

const TraderVueLogo = ({ className = "", collapsed = false }: TraderVueLogoProps) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <img 
        src="/lovable-uploads/aee91d92-2b8d-4a39-bd96-b8e972e4a269.png" 
        alt="AlgoTouch Logo" 
        className={`transition-all duration-300 hover:scale-105 ${collapsed ? 'h-8 w-auto' : 'h-16 w-auto'}`}
      />
    </div>
  );
};

export default TraderVueLogo;
