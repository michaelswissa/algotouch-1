
import React from 'react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import { Bot, Lightbulb, Sparkles, Zap, Brain, MessageSquare } from 'lucide-react';
import { Card } from '@/components/ui/card';

const AIAssistant = () => {
  const aiFeatures = [
    {
      title: "מסחר אלגוריתמי",
      description: "שאל כל שאלה על הגדרות, אסטרטגיות והיבטים טכניים של מסחר אלגוריתמי",
      icon: <Sparkles className="h-6 w-6 text-purple-400" />
    },
    {
      title: "תמיכה טכנית",
      description: "קבל עזרה בהגדרת פרמטרים כמו Position Sizing, Stop Loss, והגדרות מתקדמות",
      icon: <Zap className="h-6 w-6 text-blue-400" />
    },
    {
      title: "תובנות וטיפים",
      description: "קבל עצות מעשיות מבוססות נתונים לשיפור ביצועי המסחר שלך",
      icon: <Lightbulb className="h-6 w-6 text-yellow-400" />
    }
  ];

  return (
    <Layout className="light-pattern">
      <div className="tradervue-container py-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <div className="p-2 rounded-full bg-primary/10 flex-shrink-0">
            <Bot size={30} className="text-primary sine-move" />
          </div>
          <span className="text-gradient-blue">AlgoTouch עוזר AI</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {aiFeatures.map((feature, index) => (
            <Card key={index} className="p-6 hover-scale bg-white/80 dark:bg-white/10 hover-glow group backdrop-blur-sm border border-white/60 dark:border-white/10 shadow-sm hover:shadow-lg transition-all duration-500">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-white/90 dark:bg-white/20 backdrop-blur-sm mb-4 floating-element shadow-md group-hover:shadow-lg transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="mb-8 glass-modern p-6 rounded-xl shadow-sm relative overflow-hidden border border-white/60 dark:border-white/10">
          {/* Decorative elements - lighter and more attractive */}
          <div className="absolute -top-16 -right-16 w-32 h-32 rounded-full bg-primary/5 blur-xl"></div>
          <div className="absolute -bottom-16 -left-16 w-32 h-32 rounded-full bg-purple-400/5 blur-xl"></div>
          
          <div className="flex items-start gap-4">
            <div className="mt-1 p-2 rounded-full bg-primary/10 flex-shrink-0">
              <Brain className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="mb-4 text-lg">
                העוזר החכם של AlgoTouch יענה על כל שאלה בנוגע למסחר אלגוריתמי, הגדרות המערכת, רמות תמיכה והתנגדות, ועוד נושאים רבים.
              </p>
              
              <p className="text-lg">
                ניתן לשאול על הגדרת פרמטרים כמו רמות תמיכה והתנגדות, Position Sizing, Stop Loss, BE Stop, 
                Trailing Stop, DCA, Martingale, ועוד נושאים טכניים נוספים.
              </p>
            </div>
          </div>
        </div>
        
        <div className="relative rounded-xl overflow-hidden border border-white/60 dark:border-white/10 shadow-sm">
          {/* Add decorative message icons - lighter */}
          <div className="absolute -top-6 -left-6 opacity-10 sine-move">
            <MessageSquare size={32} className="text-primary" />
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-10 floating-element">
            <MessageSquare size={24} className="text-primary" />
          </div>
          
          <ChatBot />
        </div>
      </div>
    </Layout>
  );
};

export default AIAssistant;
