
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-full flex flex-col items-center justify-center py-12">
      <div className="text-center">
        <div className="flex justify-center mb-5">
          <AlertTriangle className="h-20 w-20 text-yellow-500" />
        </div>
        <h1 className="text-4xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-2">הדף לא נמצא</h2>
        <p className="text-muted-foreground mb-6">
          העמוד שחיפשת אינו קיים או שהועבר למיקום אחר.
        </p>
        <div className="flex gap-4 justify-center">
          <Button onClick={() => navigate(-1)}>
            חזור לעמוד הקודם
          </Button>
          <Button onClick={() => navigate('/')} variant="outline">
            חזור לדף הבית
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
