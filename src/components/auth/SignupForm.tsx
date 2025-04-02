
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';
import { sendWelcomeEmail } from '@/lib/email-service';
import { useNavigate } from 'react-router-dom';

interface SignupFormProps {
  onSignupSuccess?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess }) => {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password || !firstName || !lastName) {
      toast.error('אנא מלא את כל שדות החובה');
      return;
    }
    
    if (password !== passwordConfirm) {
      toast.error('הסיסמאות אינן תואמות');
      return;
    }
    
    try {
      setSigningUp(true);
      await signUp(email, password, {
        firstName,
        lastName,
        phone
      });
      
      // Send welcome email via our custom email service
      const fullName = `${firstName} ${lastName}`;
      await sendWelcomeEmail(email, fullName);
      
      toast.success('נרשמת בהצלחה! עכשיו נמשיך לבחירת תכנית מנוי.');
      
      // Proceed to subscription page directly without waiting for email verification
      if (onSignupSuccess) {
        onSignupSuccess();
      } else {
        navigate('/subscription');
      }
    } catch (error) {
      console.error('Signup error:', error);
      toast.error('אירעה שגיאה בתהליך ההרשמה. אנא נסה שוב מאוחר יותר.');
    } finally {
      setSigningUp(false);
    }
  };

  return (
    <Card className="glass-card-2025">
      <CardHeader>
        <CardTitle>הרשמה</CardTitle>
        <CardDescription>צור חשבון חדש כדי להתחיל</CardDescription>
      </CardHeader>
      <form onSubmit={handleSignup}>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="first-name">שם פרטי</Label>
              <Input 
                id="first-name" 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last-name">שם משפחה</Label>
              <Input 
                id="last-name" 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">דוא"ל</Label>
            <Input 
              id="signup-email" 
              type="email" 
              placeholder="name@example.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">טלפון</Label>
            <Input 
              id="phone" 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">סיסמה</Label>
            <Input 
              id="signup-password" 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-confirm">אימות סיסמה</Label>
            <Input 
              id="password-confirm" 
              type="password" 
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={signingUp}>
            {signingUp ? 'מבצע הרשמה...' : 'הרשם'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignupForm;
