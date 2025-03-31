
import React from 'react';
import { motion } from 'framer-motion';
import { CheckIcon, AlertTriangle, CheckCircle2, XCircle, Info } from 'lucide-react';

interface ReportMetricsProps {
  data: {
    intervention: {
      level: string;
      reasons: string[];
    };
    market: {
      surprise: string;
      notes?: string;
    };
    confidence: {
      level: number;
    };
    algoPerformance: {
      checked: string;
      notes?: string;
    };
    risk: {
      percentage: number;
      comfortLevel: number;
    };
  };
}

const ReportMetrics: React.FC<ReportMetricsProps> = ({ data }) => {
  const getInterventionIcon = () => {
    switch (data.intervention.level) {
      case 'none':
        return <CheckCircle2 className="text-green-500" size={24} />;
      case 'wanted':
        return <AlertTriangle className="text-amber-500" size={24} />;
      case 'intervened':
        return <XCircle className="text-red-500" size={24} />;
      default:
        return <Info className="text-blue-500" size={24} />;
    }
  };

  const getInterventionText = () => {
    switch (data.intervention.level) {
      case 'none':
        return 'לא שיניתי';
      case 'wanted':
        return 'רציתי להתערב';
      case 'intervened':
        return 'התערבתי בפועל';
      default:
        return 'לא צוין';
    }
  };

  const getMarketIcon = () => {
    switch (data.market.surprise) {
      case 'no':
        return <CheckIcon className="text-green-500" size={24} />;
      case 'yes':
        return <AlertTriangle className="text-amber-500" size={24} />;
      default:
        return <Info className="text-blue-500" size={24} />;
    }
  };

  const getConfidenceLevelColor = (level: number) => {
    if (level <= 2) return 'bg-red-500';
    if (level === 3) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const getComfortLevelColor = (level: number) => {
    if (level <= 2) return 'bg-red-500';
    if (level === 3) return 'bg-amber-500';
    return 'bg-green-500';
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <>
      {/* Intervention Section */}
      <motion.div className="space-y-4" variants={item}>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          🔁 התערבות באלגו
        </h3>
        
        <div className="bg-card/50 p-4 rounded-lg border border-border/30">
          <div className="flex items-center gap-3 mb-3">
            {getInterventionIcon()}
            <span className="font-medium">{getInterventionText()}</span>
          </div>
          
          {data.intervention.level === 'intervened' && data.intervention.reasons.length > 0 && (
            <div className="mt-3">
              <div className="text-sm font-medium mb-2">הסיבות להתערבות:</div>
              <div className="flex flex-wrap gap-2">
                {data.intervention.reasons.map((reason) => (
                  <div 
                    key={reason} 
                    className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-sm"
                  >
                    {reason === 'fear' && 'פחד מהפסד'}
                    {reason === 'fix' && 'רצון לתקן עסקה'}
                    {reason === 'distrust' && 'חוסר אמון באלגו'}
                    {reason === 'greed' && 'חמדנות / FOMO'}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Market Direction Section */}
      <motion.div className="space-y-4" variants={item}>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          📈 כיוון השוק
        </h3>
        
        <div className="bg-card/50 p-4 rounded-lg border border-border/30">
          <div className="flex items-center gap-3 mb-3">
            {getMarketIcon()}
            <span className="font-medium">
              {data.market.surprise === 'no' ? 'השוק התנהג כצפוי' : 'השוק הפתיע אותי'}
            </span>
          </div>
          
          {data.market.surprise === 'yes' && data.market.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/10 p-3 rounded-md text-sm text-amber-800 dark:text-amber-300 mt-2">
              {data.market.notes}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Confidence Section */}
      <motion.div className="space-y-4" variants={item}>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          🧠 ביטחון במסחר
        </h3>
        
        <div className="bg-card/50 p-4 rounded-lg border border-border/30">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">רמת הביטחון:</span>
            <span className="font-bold text-lg">{data.confidence.level}/5</span>
          </div>
          
          <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
            <div 
              className={`h-full ${getConfidenceLevelColor(data.confidence.level)}`}
              style={{ width: `${(data.confidence.level / 5) * 100}%` }}
            />
          </div>
          
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>חשש מתנודתיות</span>
            <span>ביטחון גבוה ותחושת שליטה</span>
          </div>
        </div>
      </motion.div>
      
      {/* Algo Performance Section */}
      <motion.div className="space-y-4" variants={item}>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          📊 בדיקת ביצועי האלגו
        </h3>
        
        <div className="bg-card/50 p-4 rounded-lg border border-border/30">
          <div className="flex items-center gap-3 mb-3">
            {data.algoPerformance.checked === 'yes' ? (
              <CheckCircle2 className="text-green-500" size={24} />
            ) : (
              <XCircle className="text-red-500" size={24} />
            )}
            <span className="font-medium">
              {data.algoPerformance.checked === 'yes' ? 'בדקתי' : 'לא הספקתי לבדוק'}
            </span>
          </div>
          
          {data.algoPerformance.checked === 'yes' && data.algoPerformance.notes && (
            <div className="bg-blue-50 dark:bg-blue-900/10 p-3 rounded-md text-sm text-blue-800 dark:text-blue-300 mt-2">
              {data.algoPerformance.notes}
            </div>
          )}
        </div>
      </motion.div>
      
      {/* Risk Management Section */}
      <motion.div className="space-y-4" variants={item}>
        <h3 className="text-xl font-semibold flex items-center gap-2">
          ⚙️ שאלות שיפור
        </h3>
        
        <div className="bg-card/50 p-4 rounded-lg border border-border/30 space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">אחוז סיכון בעסקה:</span>
              <span className="font-bold text-lg">{data.risk.percentage}%</span>
            </div>
            
            <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500"
                style={{ width: `${(data.risk.percentage / 2) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">רמת נוחות עם הפסדים:</span>
              <span className="font-bold text-lg">{data.risk.comfortLevel}/5</span>
            </div>
            
            <div className="h-4 bg-muted/50 rounded-full overflow-hidden">
              <div 
                className={`h-full ${getComfortLevelColor(data.risk.comfortLevel)}`}
                style={{ width: `${(data.risk.comfortLevel / 5) * 100}%` }}
              />
            </div>
            
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>לא נוח בכלל</span>
              <span>נוח לגמרי</span>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
};

export default ReportMetrics;
