
import React from 'react';

const TraderVueLogo = ({ className = "" }: { className?: string }) => {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <div className="w-6 h-6 rounded-full border-2 border-[#0299FF] flex items-center justify-center">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" className="text-[#0299FF]">
          <path 
            d="M5 13l4 4L19 7" 
            stroke="currentColor" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
      </div>
      <span className="font-semibold text-slate-800">Algo<span className="text-[#0299FF]">Touch.AI</span></span>
    </div>
  );
};

export default TraderVueLogo;
