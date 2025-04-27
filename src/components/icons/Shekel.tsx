
import React from 'react';

interface ShekelProps {
  className?: string;
}

export const Shekel: React.FC<ShekelProps> = ({ className = "" }) => {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
      width="24"
      height="24"
    >
      <path d="M6 3v18m6-10v10m6-18v8a4 4 0 0 1-4 4h-4" />
    </svg>
  );
};
