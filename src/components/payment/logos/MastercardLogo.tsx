
import React from 'react';

interface LogoProps {
  className?: string;
}

const MastercardLogo: React.FC<LogoProps> = ({ className }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 750 471" 
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Mastercard"
    >
      <rect width="750" height="471" fill="#000" rx="40" />
      <g transform="translate(75, 80)">
        <circle cx="236" cy="155" r="155" fill="#EB001B" />
        <circle cx="364" cy="155" r="155" fill="#F79E1B" />
        <path fill="#FF5F00" d="M300 155c0 42.5-17.7 80.8-45.9 107.8 28.2-27 45.9-65.2 45.9-107.8s-17.7-80.8-45.9-107.8C282.3 74.2 300 112.5 300 155z"/>
      </g>
      <text x="570" y="330" fill="#FFF" font-family="Arial" font-size="40" text-anchor="end">mastercard</text>
    </svg>
  );
};

export default MastercardLogo;
