
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth';

const Navbar = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between">
        <div className="mr-4 flex">
          <div onClick={() => navigate('/')} className="flex items-center space-x-2 cursor-pointer">
            <span className="font-bold text-xl">TraderVue</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isAuthenticated ? (
            <Button variant="outline" size="sm" onClick={() => navigate('/auth')}>
              התחבר
            </Button>
          ) : (
            <div className="text-sm font-medium">
              {user?.user_metadata?.first_name || 'משתמש'}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
