
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
      <rect width="750" height="471" fill="#1F72CD" rx="40" />
      <path fill="#FFFFFF" d="M650,124h-55c-6.6,0-12-5.4-12-12v-12c0-6.6,5.4-12,12-12h55c6.6,0,12,5.4,12,12v12C662,118.6,656.6,124,650,124z" opacity="0.8"/>
      <path fill="#FFFFFF" d="M650,176h-55c-6.6,0-12-5.4-12-12v-12c0-6.6,5.4-12,12-12h55c6.6,0,12,5.4,12,12v12C662,170.6,656.6,176,650,176z" opacity="0.6"/>
      <path fill="#FFFFFF" d="M650,228h-55c-6.6,0-12-5.4-12-12v-12c0-6.6,5.4-12,12-12h55c6.6,0,12,5.4,12,12v12C662,222.6,656.6,228,650,228z" opacity="0.4"/>
      <text x="650" y="380" font-family="Arial" font-size="60" fill="#FFFFFF" font-weight="bold" text-anchor="end">C*4</text>
    </svg>
  );
};

export default GenericCardLogo;
