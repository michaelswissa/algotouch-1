
import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface QuestionStepProps {
  title: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

const QuestionStep: React.FC<QuestionStepProps> = ({ 
  title, 
  children, 
  icon,
  className
}) => {
  return (
    <div className={cn("space-y-8 w-full", className)} dir="rtl">
      <h2 className="text-2xl lg:text-3xl font-semibold flex items-center gap-3 text-primary text-right mr-1">
        {icon}
        {title}
      </h2>
      <div className="space-y-8 mt-6">
        {children}
      </div>
    </div>
  );
};

export default QuestionStep;
