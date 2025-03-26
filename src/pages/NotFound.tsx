
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TraderVueLogo from '@/components/TraderVueLogo';
import { HomeIcon, RefreshCcw, AlertTriangle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center dark:bg-background bg-opacity-90 px-4 animate-fade-in" dir="rtl">
      <div className="glass-card p-8 rounded-xl shadow-xl max-w-lg w-full text-center">
        <TraderVueLogo className="mb-8 mx-auto" />
        
        <div className="mb-6 flex flex-col items-center">
          <AlertTriangle size={50} className="text-yellow-500 mb-4 animate-pulse-subtle" />
          <h1 className="text-6xl font-bold mb-2 text-primary">404</h1>
          <p className="text-xl text-muted-foreground mb-8">העמוד לא נמצא</p>
        </div>
        
        <div className="max-w-md text-center mb-8">
          <p className="text-muted-foreground">
            העמוד שאתה מחפש עשוי להיות הוסר, השם שלו שונה, או שהוא אינו זמין כרגע.
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => navigate('/')} 
            className="min-w-[150px] flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:scale-105"
          >
            <HomeIcon size={16} />
            דף הבית
          </Button>
          
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline" 
            className="min-w-[150px] flex items-center gap-2 border-border hover:bg-secondary/80 transition-all duration-300 hover:scale-105"
          >
            <RefreshCcw size={16} />
            רענן עמוד
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
