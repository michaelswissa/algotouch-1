
import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const CompletionStep: React.FC = () => {
  return (
    <div className="space-y-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        className="mx-auto bg-green-100 dark:bg-green-900/30 p-6 rounded-full w-24 h-24 flex items-center justify-center"
      >
        <Check className="w-12 h-12 text-green-600 dark:text-green-400" />
      </motion.div>
      
      <h2 className="text-xl font-semibold">השאלון מוכן לשליחה!</h2>
      <p className="text-muted-foreground max-w-md mx-auto">
        תודה על מילוי השאלון היומי. המידע שהזנת יסייע לך לשפר את המסחר ולזהות דפוסים לאורך זמן.
      </p>
    </div>
  );
};

export default CompletionStep;
