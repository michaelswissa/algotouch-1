
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
    <div className={cn("space-y-6", className)}>
      <h2 className="text-xl font-semibold flex items-center gap-2 text-primary/90">
        {icon}
        {title}
      </h2>
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
};

export default QuestionStep;
