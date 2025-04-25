
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth';
import { useRegistration } from '@/contexts/registration/RegistrationContext';

interface SignupFormProps {
  onAuthFailure?: () => void;
}

const SignupForm: React.FC<SignupFormProps> = ({ onAuthFailure }) => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const { updateRegistrationData, registrationData } = useRegistration();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [signingUp, setSigningUp] = useState(false);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Load data from registration context if available
  useEffect(() => {
    if (registrationData && registrationData.isValid) {
      if (registrationData.email) setEmail(registrationData.email);
      if (registrationData.userData?.firstName) setFirstName(registrationData.userData.firstName);
      if (registrationData.userData?.lastName) setLastName(registrationData.userData.lastName);
      if (registrationData.userData?.phone) setPhone(registrationData.userData.phone);
    }
  }, [registrationData]);

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
    if (phone.trim() && !/^05\d{8}$/.test(phone)) {
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
      
      // Save registration data to context first
      const saved = await updateRegistrationData({
        email,
        userData: {
          firstName,
          lastName,
          phone
        }
      });
      
      if (!saved) {
        throw new Error('שגיאה בשמירת נתוני הרשמה');
      }
      
      // For now just navigate to subscription without creating user account
      navigate('/subscription', { replace: true });
      toast.success('הפרטים נשמרו בהצלחה');
      
    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error(error.message || 'אירעה שגיאה בתהליך ההרשמה');
      
      if (onAuthFailure) {
        onAuthFailure();
      }
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
                disabled={signingUp}
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
                disabled={signingUp}
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
              disabled={signingUp}
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
              disabled={signingUp}
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
              disabled={signingUp}
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
              disabled={signingUp}
            />
            {errors.passwordConfirm && <p className="text-xs text-red-500">{errors.passwordConfirm}</p>}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={signingUp}>
            {signingUp ? 'מעבד בקשה...' : 'המשך לבחירת תכנית'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default SignupForm;
