
import React from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Brain, CheckCircle2, Info, Loader2 } from 'lucide-react';

interface AIInsightSectionProps {
  insight?: string;
  isLoading?: boolean;
}

const AIInsightSection: React.FC<AIInsightSectionProps> = ({ 
  insight = "בסיס על הדיווח שלך, הנה כמה תובנות: שים לב לאיך המצב הרגשי שלך משפיע על התערבות באלגו. תן לאלגו לעבוד באופן עצמאי גם כשהשוק מפתיע, הפחתת התערבות תוביל לתוצאות טובות יותר לאורך זמן.", 
  isLoading = false 
}) => {
  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const getAlertStyle = () => {
    // Simple content analysis to determine style
    if (insight.includes("חשש") || insight.includes("בעיה") || insight.includes("סיכון")) {
      return {
        icon: <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />,
        bgColor: "bg-red-950/20 border-red-800/30",
        textColor: "text-red-200"
      };
    } else if (insight.includes("שיפור") || insight.includes("תשומת לב") || insight.includes("לב ל")) {
      return {
        icon: <Info className="h-5 w-5 text-amber-500 shrink-0" />,
        bgColor: "bg-amber-950/20 border-amber-800/30",
        textColor: "text-amber-200"
      };
    } else {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />,
        bgColor: "bg-green-950/20 border-green-800/30",
        textColor: "text-green-200"
      };
    }
  };
  
  const alertStyle = getAlertStyle();

  return (
    <motion.div className="space-y-4" variants={item}>
      <h3 className="text-xl font-semibold flex items-center gap-2 justify-end">
        תובנה יומית מ-AlgoTouch AI ✨
      </h3>
      
      <div className={`p-4 rounded-lg border transition-all duration-300 ${alertStyle.bgColor}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-5 w-5 text-primary animate-spin ml-2" />
            <p>מייצר תובנה מותאמת אישית...</p>
          </div>
        ) : (
          <div className="flex gap-3">
            {alertStyle.icon}
            <p className={`${alertStyle.textColor}`}>
              {insight}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AIInsightSection;
