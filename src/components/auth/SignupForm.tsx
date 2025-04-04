
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';

interface SignupFormProps {
  onSignupSuccess?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onSignupSuccess }) => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [signingUp, setSigningUp] = useState(false);

  const validateForm = () => {
    // Email validation with regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error('כתובת אימייל לא תקינה');
      return false;
    }
    
    // Password validation
    if (password.length < 6) {
      toast.error('הסיסמה חייבת להכיל לפחות 6 תווים');
      return false;
    }
    
    if (password !== passwordConfirm) {
      toast.error('הסיסמאות אינן תואמות');
      return false;
    }
    
    // Name validation
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('שם פרטי ושם משפחה הם שדות חובה');
      return false;
    }
    
    // Phone validation (if provided) - must be only digits and optional +
    if (phone.trim() && !/^(\+)?[0-9]+$/.test(phone)) {
      toast.error('מספר טלפון לא תקין. יש להזין רק ספרות');
      return false;
    }
    
    return true;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setSigningUp(true);
      console.log('Starting registration process for:', email);
      
      // Use auth context to sign up
      await signUp({
        email,
        password,
        firstName,
        lastName,
        phone
      });
      
      // Store registration data in session storage for the subscription flow
      const registrationData = {
        email,
        userData: {
          firstName,
          lastName,
          phone: phone.trim() // Ensure clean phone data
        },
        registrationTime: new Date().toISOString()
      };
      
      // Clear any existing registration data to start fresh
      sessionStorage.removeItem('registration_data');
      sessionStorage.setItem('registration_data', JSON.stringify(registrationData));
      
      console.log('Registration data saved to session storage');
      toast.success('הפרטים נשמרו בהצלחה');
      
      // Navigate directly to subscription page bypassing the ProtectedRoute check
      navigate('/subscription', { replace: true, state: { isRegistering: true } });
      
      if (onSignupSuccess) {
        onSignupSuccess();
      }
    } catch (error: any) {
      console.error('Signup validation error:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך ההרשמה');
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
              <Label htmlFor="last-name">שם משפחה</Label>
              <Input 
                id="last-name" 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
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
              placeholder="05X-XXXXXXX"
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
              minLength={6}
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
            {signingUp ? 'בודק פרטים...' : 'המשך לבחירת תכנית'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignupForm;
