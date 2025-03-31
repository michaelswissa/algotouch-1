
import React from 'react';
import { motion } from 'framer-motion';

interface DailyInsightSectionProps {
  insight?: string;
}

const DailyInsightSection: React.FC<DailyInsightSectionProps> = ({ insight }) => {
  if (!insight) return null;

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div className="space-y-4" variants={item}>
      <h3 className="text-xl font-semibold flex items-center gap-2">
        ✍️ מה למדת היום?
      </h3>
      
      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg text-blue-800 dark:text-blue-200 border border-blue-100 dark:border-blue-900/30">
        {insight}
      </div>
    </motion.div>
  );
};

export default DailyInsightSection;
