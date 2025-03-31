
import React from 'react';
import { HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from '@/components/ui/button';

interface MetricsOverviewProps {
  metrics: {
    ess: number;
    ii: number;
    omrs: number;
    tg: number;
    ai: number;
  };
}

const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
            metrics.ess > 3.5 ? "border-green-600" : metrics.ess > 2.5 ? "border-yellow-600" : "border-red-600"
          }`}
        >
          <div className="text-sm text-muted-foreground">יציבות רגשית (ESS)</div>
          <div className={`text-xl font-bold mt-1 ${
            metrics.ess > 3.5 ? "text-green-400" : metrics.ess > 2.5 ? "text-yellow-400" : "text-red-400"
          }`}>{metrics.ess}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center">
            <span>ממוצע 5 מדדי הרגש</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card max-w-xs">
                  <p className="text-xs">ממוצע של מצב רוח, אמון באלגו, כושר למסחר, משמעת ושליטה.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
            metrics.ii < 1.5 ? "border-green-600" : metrics.ii < 3 ? "border-yellow-600" : "border-red-600"
          }`}
        >
          <div className="text-sm text-muted-foreground">מדד התערבות (II)</div>
          <div className={`text-xl font-bold mt-1 ${
            metrics.ii < 1.5 ? "text-green-400" : metrics.ii < 3 ? "text-yellow-400" : "text-red-400"
          }`}>{metrics.ii}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center">
            <span>נטייה להתערב באלגו</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card max-w-xs">
                  <p className="text-xs">מבטא את רמת הרצון להתערב באלגוריתם. ערך נמוך מעיד על אמון גבוה.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
            metrics.omrs > 3.5 ? "border-green-600" : metrics.omrs > 2.5 ? "border-yellow-600" : "border-red-600"
          }`}
        >
          <div className="text-sm text-muted-foreground">מוכנות מנטלית (OMRS)</div>
          <div className={`text-xl font-bold mt-1 ${
            metrics.omrs > 3.5 ? "text-green-400" : metrics.omrs > 2.5 ? "text-yellow-400" : "text-red-400"
          }`}>{metrics.omrs}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center">
            <span>מוכנות כוללת למסחר</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card max-w-xs">
                  <p className="text-xs">מדד סופי המשקלל את כל הפרמטרים. הערך האידיאלי הוא 5.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.4 }}
          className={`bg-card/50 p-3 rounded-lg shadow-sm border ${
            metrics.tg < 1.5 ? "border-green-600" : metrics.tg < 3 ? "border-yellow-600" : "border-red-600"
          }`}
        >
          <div className="text-sm text-muted-foreground">פער אמון (TG)</div>
          <div className={`text-xl font-bold mt-1 ${
            metrics.tg < 1.5 ? "text-green-400" : metrics.tg < 3 ? "text-yellow-400" : "text-red-400"
          }`}>{metrics.tg}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center">
            <span>פער מהאמון המקסימלי</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card max-w-xs">
                  <p className="text-xs">ההפרש בין האמון האידיאלי (5) לאמון הנוכחי שלך. ערך נמוך מעיד על אמון גבוה.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className={`p-3 rounded-lg shadow-sm border ${
            metrics.ai < 1.5 ? "bg-card/50 border-green-600" : 
            metrics.ai < 2.5 ? "bg-yellow-950/10 border-yellow-600" : 
            "bg-red-950/20 border-red-600"
          }`}
        >
          <div className="text-sm text-muted-foreground">מדד אזהרה (AI)</div>
          <div className={`text-xl font-bold mt-1 ${
            metrics.ai < 1.5 ? "text-green-400" : 
            metrics.ai < 2.5 ? "text-yellow-400" : 
            "text-red-400 animate-pulse"
          }`}>{metrics.ai}</div>
          <div className="text-xs text-muted-foreground mt-1 flex items-center">
            <span>סף אזהרה: 2.5</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-5 w-5 mr-1 p-0">
                    <HelpCircle className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-card max-w-xs">
                  <p className="text-xs">מדד המשקלל גורמי סיכון. ערך מעל 2.5 מהווה התראה משמעותית!</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MetricsOverview;
