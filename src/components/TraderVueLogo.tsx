
import React from 'react';
import OptimizedImage from './OptimizedImage';

interface TraderVueLogoProps {
  className?: string;
  collapsed?: boolean;
}

const TraderVueLogo = ({
  className = "",
  collapsed = false
}: TraderVueLogoProps) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <OptimizedImage 
        alt="AlgoTouch Logo" 
        src="/lovable-uploads/f0cb042e-cccc-41b8-a548-8b9daae5810e.png" 
        className="h-48 w-auto"
        priority={true} // This is a critical image, load it eagerly
      />
    </div>
  );
};

export default TraderVueLogo;
