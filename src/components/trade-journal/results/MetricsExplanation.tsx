
import React from 'react';
import { motion } from 'framer-motion';

const MetricsExplanation: React.FC = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 }}
      className="bg-card/50 p-4 rounded-lg shadow-sm border border-muted"
    >
      <h3 className="text-base font-medium mb-3 border-r-4 border-primary/60 pr-2">הסבר המדדים</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="font-medium text-green-400">ESS</span>
            <span className="text-muted-foreground text-sm">(Emotional Stability Score)</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            ממוצע של 5 מדדים: מצב רגשי, אמון באלגוריתם, כושר למסחר, משמעת ושליטה עצמית.
          </p>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="font-medium text-blue-400">II</span>
            <span className="text-muted-foreground text-sm">(Intervention Index)</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            משקלל את הדחף להתערב עם השפעת בדיקת הביצועים מהיום הקודם.
          </p>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="font-medium text-violet-400">OMRS</span>
            <span className="text-muted-foreground text-sm">(Overall Mental Readiness Score)</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            מדד מוכנות כולל המשקלל את כל הפרמטרים. נע בין 1-5, כאשר ערך גבוה הוא חיובי.
          </p>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="font-medium text-amber-400">TG</span>
            <span className="text-muted-foreground text-sm">(Trust Gap)</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            הפער בין האמון המקסימלי לאמון הנוכחי. ערך גבוה מצביע על חוסר אמון.
          </p>
        </div>
        
        <div className="space-y-1.5">
          <div className="flex gap-2">
            <span className="font-medium text-red-400">AI</span>
            <span className="text-muted-foreground text-sm">(Alert Index)</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            מדד המשקלל גורמי סיכון להתנהגות רגשית לא יציבה. ערך מעל 2.5 מהווה אזהרה.
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default MetricsExplanation;
