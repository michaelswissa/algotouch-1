
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TraderVueLogo from '@/components/TraderVueLogo';
import { HomeIcon, RefreshCcw } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4" dir="rtl">
      <TraderVueLogo className="mb-8" />
      
      <h1 className="text-5xl font-bold mb-2 text-primary">404</h1>
      <p className="text-xl text-gray-600 mb-8">העמוד לא נמצא</p>
      
      <div className="max-w-md text-center mb-8">
        <p className="text-gray-500">
          העמוד שאתה מחפש עשוי להיות הוסר, השם שלו שונה, או שהוא אינו זמין כרגע.
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4">
        <Button 
          onClick={() => navigate('/')} 
          className="min-w-[150px] flex items-center gap-2"
        >
          <HomeIcon size={16} />
          דף הבית
        </Button>
        
        <Button 
          onClick={() => window.location.reload()} 
          variant="outline" 
          className="min-w-[150px] flex items-center gap-2"
        >
          <RefreshCcw size={16} />
          רענן עמוד
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
