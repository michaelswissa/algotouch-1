
import React from 'react';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <Layout className="py-8" hideSidebar>
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-12 text-center">
          <h1 className="text-4xl font-bold mb-4">ברוכים הבאים לTraderVue</h1>
          <p className="text-xl text-muted-foreground">פלטפורמת המסחר המובילה בישראל</p>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6 justify-center mb-12">
          <Button asChild size="lg" className="px-8 py-6 text-lg">
            <Link to="/subscription">הירשם עכשיו</Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 py-6 text-lg">
            <Link to="/auth">התחברות</Link>
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="p-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">ניתוח מסחר</h2>
            <p>כלים מתקדמים לניתוח עסקאות ומעקב אחר ביצועים</p>
          </div>
          <div className="p-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">יומן מסחר</h2>
            <p>תיעוד עסקאות, רגשות ואסטרטגיות מסחר</p>
          </div>
          <div className="p-6 bg-muted rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-2">קורסים והדרכות</h2>
            <p>חומרי לימוד מקצועיים לשיפור מיומנויות המסחר</p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default HomePage;
