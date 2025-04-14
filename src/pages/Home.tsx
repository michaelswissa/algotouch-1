
import React from 'react';
import Layout from '@/components/Layout';

const Home = () => {
  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-6 text-center">
          ברוכים הבאים לTraderVue
        </h1>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">מה זה TraderVue?</h2>
            <p className="text-gray-600">
              כלי מתקדם לניהול ומעקב אחר סחר בשוק ההון, המאפשר לך לנתח את הביצועים שלך ולשפר את האסטרטגיה שלך.
            </p>
          </div>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">יתרונות המערכת</h2>
            <ul className="list-disc list-inside text-gray-600">
              <li>מעקב מלא אחר עסקאות</li>
              <li>ניתוח ביצועים מתקדם</li>
              <li>מדדים רגשיים לסוחרים</li>
              <li>למידה מתמדת ושיפור</li>
            </ul>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Home;
