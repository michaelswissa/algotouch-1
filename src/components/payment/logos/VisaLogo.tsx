
import React from 'react';

interface LogoProps {
  className?: string;
}

const VisaLogo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 750 471" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Visa Card"
    >
      <path fill="#fff" d="M278.2,334.1c-9.6,4.7-25,8.3-44,8.3c-48.2,0-82-24.2-82-70.9c0-42.5,32.1-74.5,83.8-74.5
        c16.7,0,31.1,3.4,38.9,7.2l-6.5,22.2c-6.8-3.4-17.4-6.5-31.8-6.5c-32.9,0-54.5,20.9-54.5,50.9c0,30.5,20.7,50.2,53.6,50.2
        c12.8,0,25.8-2.6,33.9-6.8L278.2,334.1z"/>
      <path fill="#fff" d="M293.8,196.1h30.5l-18.7,109.8h-30.4L293.8,196.1z"/>
      <path fill="#fff" d="M405.1,305.8l3.9-22.2h-48.1l26.1-88h31.2l-21.9,71.2h28.3l-9.5,27.1h-15.7l-9,27.1H405.1z"/>
      <path fill="#fff" d="M457.5,304.9l26.5-109.2h31.6l-26.6,109.2H457.5z"/>
    </svg>
  );
};

export default VisaLogo;
