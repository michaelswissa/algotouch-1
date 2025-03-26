
import React from 'react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';
import { Bot, Lightbulb, Sparkles } from 'lucide-react';
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
      icon: <Bot className="h-6 w-6 text-blue-500" />
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
          <Bot size={30} className="text-primary" />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">AlgoTouch עוזר AI</span>
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {aiFeatures.map((feature, index) => (
            <Card key={index} className="p-6 hover-scale bg-gradient-to-br from-card to-secondary/80 backdrop-blur-sm">
              <div className="flex flex-col items-center text-center">
                <div className="p-3 rounded-full bg-secondary mb-4 float">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground text-sm">{feature.description}</p>
              </div>
            </Card>
          ))}
        </div>
        
        <div className="mb-8 glass-card p-6 rounded-xl shadow-md">
          <p className="mb-4 text-lg">
            העוזר החכם של AlgoTouch יענה על כל שאלה בנוגע למסחר אלגוריתמי, הגדרות המערכת, רמות תמיכה והתנגדות, ועוד נושאים רבים.
          </p>
          
          <p className="text-lg">
            ניתן לשאול על הגדרת פרמטרים כמו רמות תמיכה והתנגדות, Position Sizing, Stop Loss, BE Stop, 
            Trailing Stop, DCA, Martingale, ועוד נושאים טכניים נוספים.
          </p>
        </div>
        
        <ChatBot />
      </div>
    </Layout>
  );
};

export default AIAssistant;
