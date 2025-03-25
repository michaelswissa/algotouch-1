
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import TraderVueLogo from '@/components/TraderVueLogo';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <TraderVueLogo className="mb-8" />
      
      <h1 className="text-4xl font-bold mb-2">404</h1>
      <p className="text-xl text-gray-600 mb-8">Oops! Page not found</p>
      
      <div className="max-w-md text-center mb-8">
        <p className="text-gray-500">
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </p>
      </div>
      
      <Button onClick={() => navigate('/dashboard')} className="min-w-[150px]">
        Go to Dashboard
      </Button>
    </div>
  );
};

export default NotFound;
