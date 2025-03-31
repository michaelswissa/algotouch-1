import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { CircleCheck, CircleX, AlertTriangle, Smile, Clock, BarChart3, LineChart, TrendingUp, TrendingDown, Minus, Brain, Zap, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import EmotionIcon from './EmotionIcon';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface TradingReportProps {
  data: {
    date: string;
    feeling: {
      rating: number;
      notes: string;
    };
    intervention: {
      level: string;
      reasons: string[];
    };
    marketDirection: string;
    mentalState: {
      rating: number;
      notes: string;
    };
    algoPerformance: {
      checked: string;
      notes: string;
    };
    riskManagement: {
      percentage: number;
      comfortLevel: number;
    };
    reflection: string;
  };
}

const TradingReport: React.FC<TradingReportProps> = ({ data }) => {
  const today = data.date || format(new Date(), 'dd/MM/yyyy');
  
  const getInterventionIcon = () => {
    switch (data.intervention.level) {
      case "none":
        return <CircleCheck className="h-5 w-5 text-green-500" />;
      case "slight":
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case "strong":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      case "actual":
        return <CircleX className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getInterventionText = () => {
    switch (data.intervention.level) {
      case "none":
        return "לא בכלל";
      case "slight":
        return "רצון קל";
      case "strong":
        return "רצון חזק";
      case "actual":
        return "התערבתי בפועל";
      default:
        return "לא צוין";
    }
  };

  const getMarketDirectionIcon = () => {
    switch (data.marketDirection) {
      case "up":
        return <TrendingUp className="h-5 w-5 text-green-500" />;
      case "sideways":
        return <Minus className="h-5 w-5 text-yellow-500" />;
      case "down":
        return <TrendingDown className="h-5 w-5 text-red-500" />;
      default:
        return <LineChart className="h-5 w-5 text-gray-500" />;
    }
  };
  
  const getMarketDirectionText = () => {
    switch (data.marketDirection) {
      case "up":
        return "עולה";
      case "sideways":
        return "מדשדש";
      case "down":
        return "יורד";
      default:
        return "לא צוין";
    }
  };

  const getInterventionReasonText = (reason: string) => {
    switch (reason) {
      case "fear":
        return "פחד מהפסד";
      case "fix":
        return "רצון לתקן";
      case "distrust":
        return "חוסר אמון באלגו";
      case "greed":
        return "חמדנות / פומו";
      default:
        return reason;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="mb-8 hover-glow shadow-md">
        <CardHeader className="pb-3 border-b border-border/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{today}</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                דוח מסחר יומי
              </span>
            </CardTitle>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* מצב רגשי כללי */}
            <div className="bg-card/30 p-4 rounded-lg border border-border/40 rtl">
              <div className="flex items-center gap-2 mb-4">
                <Smile className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">מצב רגשי כללי</h3>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">הרגשה כללית:</span>
                <div className="flex items-center gap-1">
                  <EmotionIcon emotion={data.feeling.rating.toString()} size={28} />
                </div>
              </div>
              
              <Progress 
                value={data.feeling.rating * 20} 
                className="h-2 mb-3"
                indicatorClassName={
                  data.feeling.rating <= 2 ? "bg-red-500" :
                  data.feeling.rating === 3 ? "bg-amber-500" :
                  "bg-green-500"
                }
              />
              
              {data.feeling.notes && (
                <div className="mt-3 bg-card/40 p-3 rounded border border-border/30 text-sm text-right">
                  {data.feeling.notes}
                </div>
              )}
            </div>
            
            {/* התערבות באלגו */}
            <div className="bg-card/30 p-4 rounded-lg border border-border/40 rtl">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">התערבות באלגו</h3>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">האם היה דחף להתערב?</span>
                <div className="flex items-center gap-2">
                  {getInterventionIcon()}
                  <span className={`text-sm ${
                    data.intervention.level === "none" ? "text-green-500" :
                    data.intervention.level === "slight" ? "text-yellow-500" :
                    data.intervention.level === "strong" ? "text-orange-500" :
                    "text-red-500"
                  }`}>
                    {getInterventionText()}
                  </span>
                </div>
              </div>
              
              {data.intervention.level === "actual" && data.intervention.reasons.length > 0 && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">סיבות להתערבות:</span>
                  <div className="flex flex-wrap gap-2 justify-end">
                    {data.intervention.reasons.map((reason, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="bg-card/50"
                      >
                        <div className="flex items-center gap-1">
                          <EmotionIcon emotion={reason} size={16} />
                          <span>{getInterventionReasonText(reason)}</span>
                        </div>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* כיוון השוק */}
            <div className="bg-card/30 p-4 rounded-lg border border-border/40 rtl">
              <div className="flex items-center gap-2 mb-4">
                <LineChart className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">כיוון השוק</h3>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">מגמת השוק:</span>
                <div className="flex items-center gap-2">
                  {getMarketDirectionIcon()}
                  <span className={`text-sm ${
                    data.marketDirection === "up" ? "text-green-500" :
                    data.marketDirection === "sideways" ? "text-yellow-500" :
                    data.marketDirection === "down" ? "text-red-500" :
                    "text-gray-500"
                  }`}>
                    {getMarketDirectionText()}
                  </span>
                </div>
              </div>
              
              <div className="h-16 mt-3 flex items-end justify-center">
                <div className="w-full flex items-end justify-between">
                  <div className={`h-12 w-8 rounded-t ${data.marketDirection === "down" ? "bg-red-500/70" : "bg-card/30"}`}></div>
                  <div className={`h-8 w-8 rounded-t ${data.marketDirection === "sideways" ? "bg-yellow-500/70" : "bg-card/30"}`}></div>
                  <div className={`h-12 w-8 rounded-t ${data.marketDirection === "up" ? "bg-green-500/70" : "bg-card/30"}`}></div>
                </div>
              </div>
            </div>
            
            {/* מצב מנטלי במסחר */}
            <div className="bg-card/30 p-4 rounded-lg border border-border/40 rtl">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">מצב מנטלי במסחר</h3>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">הרגשה מנטלית:</span>
                <div className="flex items-center gap-1">
                  <EmotionIcon emotion={data.mentalState.rating.toString()} size={28} />
                </div>
              </div>
              
              <Progress 
                value={data.mentalState.rating * 20} 
                className="h-2 mb-3"
                indicatorClassName={
                  data.mentalState.rating <= 2 ? "bg-red-500" :
                  data.mentalState.rating === 3 ? "bg-amber-500" :
                  "bg-green-500"
                }
              />
              
              {data.mentalState.notes && (
                <div className="mt-3 bg-card/40 p-3 rounded border border-border/30 text-sm text-right">
                  {data.mentalState.notes}
                </div>
              )}
            </div>
            
            {/* בדיקת ביצועי האלגו */}
            <div className="bg-card/30 p-4 rounded-lg border border-border/40 rtl">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">בדיקת ביצועי האלגו</h3>
              </div>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">האם נבדקו ביצועי האלגו?</span>
                <div className="flex items-center gap-2">
                  {data.algoPerformance.checked === "yes" ? (
                    <CircleCheck className="h-5 w-5 text-green-500" />
                  ) : (
                    <CircleX className="h-5 w-5 text-red-500" />
                  )}
                  <span className={`text-sm ${data.algoPerformance.checked === "yes" ? "text-green-500" : "text-red-500"}`}>
                    {data.algoPerformance.checked === "yes" ? "נבדקו" : "לא נבדקו"}
                  </span>
                </div>
              </div>
              
              {data.algoPerformance.checked === "yes" && data.algoPerformance.notes && (
                <div>
                  <span className="text-sm text-muted-foreground block mb-2">מסקנות עיקריות:</span>
                  <div className="bg-card/40 p-3 rounded border border-border/30 text-sm text-right">
                    {data.algoPerformance.notes}
                  </div>
                </div>
              )}
            </div>
            
            {/* שיפור ביצועים */}
            <div className="bg-card/30 p-4 rounded-lg border border-border/40 rtl">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">שיפור ביצועים</h3>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">אחוז סיכון בעסקה:</span>
                  <span className="font-medium text-primary">{data.riskManagement.percentage}%</span>
                </div>
                
                <Progress 
                  value={(data.riskManagement.percentage / 2) * 100} 
                  className="h-2 mb-1"
                  indicatorClassName={
                    data.riskManagement.percentage > 1.5 ? "bg-red-500" :
                    data.riskManagement.percentage > 0.8 ? "bg-amber-500" :
                    "bg-green-500"
                  }
                />
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">מידת נוחות עם הפסדים:</span>
                  <div className="flex items-center gap-1">
                    <EmotionIcon emotion={data.riskManagement.comfortLevel.toString()} size={24} />
                  </div>
                </div>
                
                <Progress 
                  value={data.riskManagement.comfortLevel * 20} 
                  className="h-2 mb-3"
                  indicatorClassName={
                    data.riskManagement.comfortLevel <= 2 ? "bg-red-500" :
                    data.riskManagement.comfortLevel === 3 ? "bg-amber-500" :
                    "bg-green-500"
                  }
                />
              </div>
            </div>
          </div>
          
          {/* רפלקציה יומית */}
          {data.reflection && (
            <div className="bg-card/30 p-4 rounded-lg border border-border/40 rtl">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-medium">רפלקציה יומית</h3>
              </div>
              
              <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 text-right">
                {data.reflection}
              </div>
            </div>
          )}
          
          <div className="flex justify-end mt-4">
            <Button className="gap-2 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105">
              <Calendar className="h-4 w-4" />
              שמור בפתקים
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default TradingReport;
