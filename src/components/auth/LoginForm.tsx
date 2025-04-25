
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';

interface LoginFormProps {
  onAuthFailure?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onAuthFailure }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!email || !password) {
      setError('יש למלא את כל השדות');
      return;
    }
    
    try {
      setIsLoggingIn(true);
      await signIn(email, password);
      // No need to handle success navigation, the Auth component will do it
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Determine error message
      let errorMessage = 'שגיאה בהתחברות';
      if (error.message?.includes('Invalid login credentials')) {
        errorMessage = 'פרטי התחברות שגויים';
      } else if (error.message?.includes('Email not confirmed')) {
        errorMessage = 'כתובת האימייל לא אומתה. אנא בדוק את תיבת הדואר שלך';
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      
      // Notify parent of auth failure
      if (onAuthFailure) {
        onAuthFailure();
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleForgotPassword = (e: React.MouseEvent) => {
    e.preventDefault();
    // Future feature: implement password reset
    toast.info('תכונה זו תהיה זמינה בקרוב');
  };

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>התחברות</CardTitle>
        <CardDescription>הזן את פרטי ההתחברות שלך</CardDescription>
      </CardHeader>
      <form onSubmit={handleLogin}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email">דוא"ל</Label>
            <Input 
              id="login-email" 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={error ? "border-red-500" : ""}
              disabled={isLoggingIn}
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="login-password">סיסמה</Label>
              <a 
                href="#" 
                onClick={handleForgotPassword}
                className="text-xs text-primary hover:underline"
              >
                שכחת סיסמה?
              </a>
            </div>
            <Input 
              id="login-password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={error ? "border-red-500" : ""}
              disabled={isLoggingIn}
              required
            />
          </div>
          
          {error && <p className="text-sm text-red-500">{error}</p>}
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={isLoggingIn}
          >
            {isLoggingIn ? 'מתחבר...' : 'התחבר'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;
