
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
      icon: <Sparkles className="h-6 w-6 text-purple-500" />
    },
    {
      title: "תמיכה טכנית",
      description: "קבל עזרה בהגדרת פרמטרים כמו Position Sizing, Stop Loss, והגדרות מתקדמות",
      icon: <Zap className="h-6 w-6 text-blue-500" />
    },
    {
      title: "תובנות וטיפים",
      description: "קבל עצות מעשיות מבוססות נתונים לשיפור ביצועי המסחר שלך",
      icon: <Lightbulb className="h-6 w-6 text-yellow-500" />
    }
  ];

  return (
    <Layout>
      <div className="tradervue-container py-6">
        <h1 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Bot size={30} className="text-primary sine-move" />
          <span className="text-gradient-blue neon-text">AlgoTouch עוזר AI</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {aiFeatures.map((feature, index) => (
            <Card key={index} className="p-6 hover-scale card-gradient hover-glow group">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-secondary/60 backdrop-blur-sm mb-4 floating-element shadow-md group-hover:shadow-lg shadow-primary/5 group-hover:shadow-primary/20 transition-all duration-500">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="mb-8 glass-modern p-6 rounded-xl shadow-md relative overflow-hidden">
          {/* Add decorative elements */}
          <div className="absolute -top-10 -right-10 w-20 h-20 rounded-full bg-primary/10 blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-purple-500/10 blur-xl"></div>
          
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
        
        <div className="relative">
          {/* Add decorative message icons */}
          <div className="absolute -top-6 -left-6 opacity-20 sine-move">
            <MessageSquare size={32} className="text-primary" />
          </div>
          <div className="absolute -bottom-4 -right-4 opacity-20 floating-element">
            <MessageSquare size={24} className="text-primary" />
          </div>
          
          <ChatBot />
        </div>
      </div>
    </Layout>
  );
};

export default AIAssistant;
