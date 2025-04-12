
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { useLocation } from 'react-router-dom';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { signIn, resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const location = useLocation();
  const state = location.state as { redirectToSubscription?: boolean };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('אנא הזן דוא"ל וסיסמה');
      return;
    }
    
    try {
      setLoggingIn(true);
      console.log('Attempting sign in with:', email);
      await signIn(email, password);
      
      console.log('Login successful, redirectToSubscription:', state?.redirectToSubscription);
      
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Show specific error messages for common errors
      if (error.message.includes('Invalid login credentials')) {
        toast.error('פרטי התחברות שגויים. אנא בדוק את הדוא"ל והסיסמה');
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('הדוא"ל שלך לא אומת. אנא בדוק את תיבת הדואר הנכנס שלך');
      } else {
        toast.error('התחברות נכשלה. אנא בדוק את פרטי ההתחברות שלך ונסה שוב.');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      toast.error('אנא הזן דוא"ל לפני שתבקש איפוס סיסמה');
      return;
    }
    
    try {
      setResettingPassword(true);
      console.log('Requesting password reset for:', email);
      
      // Use the AuthContext resetPassword method
      await resetPassword(email);
      
      console.log('Password reset email sent successfully');
      toast.success('הוראות לאיפוס הסיסמה נשלחו לדוא"ל שלך');
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast.error('אירעה שגיאה בעת איפוס הסיסמה. אנא נסה שוב מאוחר יותר.');
    } finally {
      setResettingPassword(false);
    }
  };

  return (
    <Card className="glass-card backdrop-blur-md bg-black/50 border border-white/10 shadow-xl">
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
              required
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Button 
                type="button" 
                variant="link" 
                className="text-sm text-primary hover:underline px-0"
                onClick={handlePasswordReset}
                disabled={resettingPassword || !email}
              >
                {resettingPassword ? 'שולח...' : '?שכחת סיסמה'}
              </Button>
              <Label htmlFor="login-password">סיסמה</Label>
            </div>
            <Input 
              id="login-password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={loggingIn}>
            {loggingIn ? 'מתחבר...' : 'התחבר'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default LoginForm;
