
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-background to-background/80 p-4">
      <div className="max-w-3xl w-full text-center space-y-8">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          מערכת ניהול מנויים
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          ברוכים הבאים למערכת ניהול המנויים שלנו. התחבר או הירשם להמשך.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Button 
            className="text-lg py-6 px-8" 
            size="lg" 
            onClick={() => navigate('/auth?tab=login')}
          >
            התחבר
          </Button>
          
          <Button 
            className="text-lg py-6 px-8" 
            variant="outline"
            size="lg"
            onClick={() => navigate('/auth?tab=signup')}
          >
            הירשם
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
