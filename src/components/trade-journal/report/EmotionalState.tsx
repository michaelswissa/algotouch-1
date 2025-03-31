
import React from 'react';
import { motion } from 'framer-motion';

interface EmotionalStateProps {
  data: {
    state: string;
    notes?: string;
  };
}

const EmotionalState: React.FC<EmotionalStateProps> = ({ data }) => {
  const getEmotionLabel = (state: string) => {
    switch (state) {
      case '😣': return 'מתוח';
      case '😕': return 'לא רגוע';
      case '😐': return 'ניטרלי';
      case '🙂': return 'רגוע';
      case '😎': return 'מפוקס ובטוח';
      default: return 'לא צוין';
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div className="space-y-4" variants={item}>
      <h3 className="text-xl font-semibold flex items-center gap-2">
        😌 מצב רגשי כללי
      </h3>
      
      <div className="bg-card/50 p-4 rounded-lg border border-border/30 flex items-center justify-between gap-4">
        <div>
          <div className="text-4xl mb-2">{data.state}</div>
          <div className="text-sm text-muted-foreground">
            {getEmotionLabel(data.state)}
          </div>
        </div>
        
        {data.notes && (
          <div className="flex-1 bg-secondary/30 p-3 rounded-md text-sm">
            {data.notes}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default EmotionalState;
