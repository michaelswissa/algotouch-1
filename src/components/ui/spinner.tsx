
import React from "react";
import { cn } from "@/lib/utils";

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | string;
}

export const Spinner = ({ className, size = "md", ...props }: SpinnerProps) => {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-6 w-6 border-2",
    lg: "h-8 w-8 border-3",
  };
  
  const sizeClass = sizeClasses[size as keyof typeof sizeClasses] || (typeof size === 'string' ? size : 'h-6 w-6 border-2');
  
  return (
    <div
      className={cn("animate-spin rounded-full border-t-transparent", sizeClass, className)}
      {...props}
    />
  );
};
