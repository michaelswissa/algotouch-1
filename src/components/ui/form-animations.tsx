
import React from 'react';
import { motion, Variants } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

// Animation variants
export const formAnimation: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: {
      duration: 0.3,
      staggerChildren: 0.1,
      when: "beforeChildren"
    }
  }
};

export const inputAnimation: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

export const buttonAnimation: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  hover: { scale: 1.02 },
  tap: { scale: 0.98 }
};

// Animated form components
export const AnimatedFormWrapper: React.FC<{
  children: React.ReactNode;
  onSubmit: () => void;
  dir?: 'rtl' | 'ltr';
}> = ({ children, onSubmit, dir = 'rtl' }) => {
  return (
    <motion.form
      onSubmit={onSubmit}
      dir={dir}
      variants={formAnimation}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.form>
  );
};

export const AnimatedInputWrapper: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  return (
    <motion.div variants={inputAnimation}>
      {children}
    </motion.div>
  );
};

export const AnimatedButton: React.FC<{
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  disabled?: boolean;
  isLoading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ type = 'button', className = '', disabled = false, isLoading = false, loadingText = 'מעבד...', children, onClick }) => {
  return (
    <motion.div
      className="w-full"
      variants={buttonAnimation}
      whileHover="hover"
      whileTap="tap"
    >
      <Button 
        type={type} 
        className={`w-full ${className}`} 
        disabled={disabled || isLoading}
        onClick={onClick}
      >
        {isLoading ? (
          <>
            <Loader2 className="ml-2 h-4 w-4 animate-spin" /> {loadingText}
          </>
        ) : (
          children
        )}
      </Button>
    </motion.div>
  );
};
