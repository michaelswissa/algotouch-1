
import React, { memo } from 'react';

interface BeamsBackgroundProps {
  className?: string;
}

/**
 * A beautiful radial gradient beams background component
 * Memoized to prevent unnecessary re-renders
 */
const BeamsBackground: React.FC<BeamsBackgroundProps> = memo(({ className }) => {
  return (
    <div
      className={`absolute inset-0 -z-10 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <div className="absolute left-0 top-0 opacity-30 dark:opacity-10">
        <div className="h-[80vh] w-[80vh] rounded-full bg-gradient-to-r from-blue-500/40 to-indigo-500/50 blur-3xl" />
      </div>
      <div className="absolute right-0 bottom-0 opacity-30 dark:opacity-10">
        <div className="h-[80vh] w-[80vh] rounded-full bg-gradient-to-l from-blue-500/40 to-indigo-500/50 blur-3xl" />
      </div>
    </div>
  );
});

BeamsBackground.displayName = 'BeamsBackground';

export default BeamsBackground;
