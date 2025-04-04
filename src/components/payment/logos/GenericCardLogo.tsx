
import React from 'react';

interface LogoProps {
  className?: string;
}

const GenericCardLogo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 750 471" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Credit Card"
    >
      <path fill="#FFFFFF" d="M40,0h670c22.1,0,40,17.9,40,40v391c0,22.1-17.9,40-40,40H40c-22.1,0-40-17.9-40-40V40C0,17.9,17.9,0,40,0z" />
      <path fill="#FFFFFF" opacity="0.5" d="M40,20c-11,0-20,9-20,20v391c0,11,9,20,20,20h670c11,0,20-9,20-20V40c0-11-9-20-20-20H40z" />
      <g opacity="0.8">
        <path fill="#FFFFFF" d="M240,130h300c11,0,20,9,20,20v35c0,11-9,20-20,20H240c-11,0-20-9-20-20v-35C220,139,229,130,240,130z" />
        <path fill="#FFFFFF" d="M160,240h440c11,0,20,9,20,20v40c0,11-9,20-20,20H160c-11,0-20-9-20-20v-40C140,249,149,240,160,240z" />
        <path fill="#FFFFFF" d="M160,330h180c11,0,20,9,20,20v30c0,11-9,20-20,20H160c-11,0-20-9-20-20v-30C140,339,149,330,160,330z" />
        <path fill="#FFFFFF" d="M500,330h100c11,0,20,9,20,20v30c0,11-9,20-20,20H500c-11,0-20-9-20-20v-30C480,339,489,330,500,330z" />
      </g>
    </svg>
  );
};

export default GenericCardLogo;
