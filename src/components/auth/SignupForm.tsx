
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
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  const validateInputs = () => {
    const newErrors: {[key: string]: string} = {};
    
    // בדיקת שדות חובה
    if (!firstName.trim()) newErrors.firstName = 'שדה חובה';
    if (!lastName.trim()) newErrors.lastName = 'שדה חובה';
    
    // בדיקת תקינות מייל
    if (!email.trim()) {
      newErrors.email = 'שדה חובה';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'כתובת מייל לא תקינה';
    }
    
    // בדיקת תקינות סיסמה
    if (!password) {
      newErrors.password = 'שדה חובה';
    } else if (password.length < 6) {
      newErrors.password = 'הסיסמה חייבת להכיל לפחות 6 תווים';
    }
    
    // בדיקת התאמת סיסמאות
    if (password !== passwordConfirm) {
      newErrors.passwordConfirm = 'הסיסמאות אינן תואמות';
    }
    
    // בדיקת תקינות מספר טלפון (אם הוזן)
    if (phone.trim() && !/^0[2-9]\d{7,8}$/.test(phone)) {
      newErrors.phone = 'מספר טלפון לא תקין';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateInputs()) {
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
          phone
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
                className={errors.lastName ? "border-red-500" : ""}
                required
              />
              {errors.lastName && <p className="text-xs text-red-500">{errors.lastName}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="first-name">שם פרטי</Label>
              <Input 
                id="first-name" 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className={errors.firstName ? "border-red-500" : ""}
                required
              />
              {errors.firstName && <p className="text-xs text-red-500">{errors.firstName}</p>}
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
              className={errors.email ? "border-red-500" : ""}
              required
            />
            {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">טלפון</Label>
            <Input 
              id="phone" 
              type="tel" 
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="05XXXXXXXX"
              className={errors.phone ? "border-red-500" : ""}
            />
            {errors.phone && <p className="text-xs text-red-500">{errors.phone}</p>}
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
              className={errors.password ? "border-red-500" : ""}
            />
            {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password-confirm">אימות סיסמה</Label>
            <Input 
              id="password-confirm" 
              type="password" 
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              className={errors.passwordConfirm ? "border-red-500" : ""}
            />
            {errors.passwordConfirm && <p className="text-xs text-red-500">{errors.passwordConfirm}</p>}
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
