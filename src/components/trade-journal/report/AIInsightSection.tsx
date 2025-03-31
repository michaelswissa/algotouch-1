
import React from 'react';
import { motion } from 'framer-motion';

const AIInsightSection: React.FC = () => {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div className="space-y-4" variants={item}>
      <h3 className="text-xl font-semibold flex items-center gap-2">
        ✨ תובנה יומית מ-AlgoTouch AI
      </h3>
      
      <div className="bg-primary/5 p-4 rounded-lg border border-primary/20">
        <p>
          בסיס על הדיווח שלך, הנה כמה תובנות: שים לב לאיך המצב הרגשי שלך משפיע על התערבות באלגו. 
          תן לאלגו לעבוד באופן עצמאי גם כשהשוק מפתיע, הפחתת התערבות תוביל לתוצאות טובות יותר לאורך זמן.
        </p>
      </div>
    </motion.div>
  );
};

export default AIInsightSection;
