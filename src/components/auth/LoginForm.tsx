
import React, { useState, useEffect } from 'react';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth";
import { Link, useNavigate } from "react-router-dom";
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: "כתובת אימייל לא תקינה" }),
  password: z.string().min(6, { message: "סיסמא חייבת להיות באורך של 6 תווים לפחות" }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm: React.FC = () => {
  const { signIn, loading, isAuthenticated } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Check for any payment redirect parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const paymentResult = searchParams.get('payment_result');
    const paymentError = searchParams.get('error');
    
    if (paymentResult === 'failed' || paymentError) {
      const errorMessage = paymentError || 'התשלום נכשל, אנא נסה שנית';
      PaymentLogger.error('Login redirect after payment failure:', { paymentResult, paymentError });
      toast.error(errorMessage);
      
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const onSubmit = async (values: LoginFormValues) => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    setAuthError(null);
    
    try {
      PaymentLogger.log('Login form submitted', { email: values.email });
      const result = await signIn(values.email, values.password);
      
      if (!result.success) {
        setAuthError(result.error || 'התחברות נכשלה. אנא בדוק את פרטי ההתחברות שלך ונסה שוב.');
      }
    } catch (error) {
      PaymentLogger.error('Login error:', error);
      const errorMessage = error instanceof Error ? error.message : 'שגיאה בתהליך ההתחברות';
      setAuthError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user is already authenticated, redirect to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      PaymentLogger.log('User already authenticated, redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>התחברות</CardTitle>
        <CardDescription>הזן את פרטי ההתחברות שלך</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>אימייל</FormLabel>
                  <FormControl>
                    <Input placeholder="your@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>סיסמא</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="******" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {authError && (
              <div className="text-sm font-medium text-red-500">{authError}</div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isSubmitting || loading}
            >
              {(isSubmitting || loading) ? (
                <span className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> מתחבר...
                </span>
              ) : (
                "התחבר"
              )}
            </Button>
            
            <div className="text-center text-sm text-muted-foreground">
              <Link to="/auth?tab=signup" className="underline hover:text-primary">
                עדיין אין לך חשבון? הירשם
              </Link>
              <div className="mt-2">
                <Link to="/reset-password" className="underline hover:text-primary">
                  שכחת את הסיסמא?
                </Link>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default LoginForm;
