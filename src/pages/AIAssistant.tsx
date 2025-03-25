
import React from 'react';
import Layout from '@/components/Layout';
import ChatBot from '@/components/ChatBot';

const AIAssistant = () => {
  return (
    <Layout>
      <div className="tradervue-container py-8 animate-fade-in" dir="rtl">
        <h1 className="text-3xl font-bold mb-6">AlgoTouch עוזר AI</h1>
        
        <div className="mb-8">
          <p className="mb-4 text-lg">
            העוזר החכם של AlgoTouch יענה על כל שאלה בנוגע למסחר אלגוריתמי, הגדרות המערכת, רמות תמיכה והתנגדות, ועוד נושאים רבים.
          </p>
          
          <p className="mb-8 text-lg">
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
