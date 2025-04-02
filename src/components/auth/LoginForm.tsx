
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LoginFormProps {
  onLoginSuccess?: () => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLoginSuccess }) => {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('אנא הזן דוא"ל וסיסמה');
      return;
    }
    
    try {
      setLoggingIn(true);
      await signIn(email, password);
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('התחברות נכשלה. אנא בדוק את פרטי ההתחברות שלך ונסה שוב.');
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
      
      // Use Supabase's built-in password reset functionality with custom templates
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success('הוראות לאיפוס הסיסמה נשלחו לדוא"ל שלך');
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('אירעה שגיאה בעת איפוס הסיסמה. אנא נסה שוב מאוחר יותר.');
    } finally {
      setResettingPassword(false);
    }
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
                {resettingPassword ? 'שולח...' : 'שכחת סיסמה?'.replace('?', '')}?
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
