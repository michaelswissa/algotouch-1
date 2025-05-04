import React from 'react';
interface TraderVueLogoProps {
  className?: string;
  collapsed?: boolean;
}
const TraderVueLogo = ({
  className = "",
  collapsed = false
}: TraderVueLogoProps) => {
  return <div className={`flex items-center gap-1 ${className}`}>
      <img alt="AlgoTouch Logo" className="" src="/lovable-uploads/f0cb042e-cccc-41b8-a548-8b9daae5810e.png" />
    </div>;
};
export default TraderVueLogo;