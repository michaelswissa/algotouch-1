
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Login form schema
const loginFormSchema = z.object({
  email: z.string().email('נדרשת כתובת אימייל תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
});

type LoginFormValues = z.infer<typeof loginFormSchema>;

interface LoginFormProps {
  redirectTo?: string | null;
}

const LoginForm: React.FC<LoginFormProps> = ({ redirectTo }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('פרטי התחברות שגויים');
        } else {
          toast.error(error.message);
        }
        return;
      }

      toast.success('התחברת בהצלחה!');
      
      // Redirect to the specified path or dashboard
      if (redirectTo) {
        navigate(redirectTo, { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      console.error('Login error:', error);
      toast.error('שגיאה בהתחברות');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="text-right px-0">
        <CardTitle>התחברות</CardTitle>
        <CardDescription>הזן את פרטי ההתחברות שלך</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} dir="rtl">
          <CardContent className="space-y-4 px-0">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="text-right">
                  <FormLabel>דואר אלקטרוני</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="name@example.com"
                      type="email"
                      autoComplete="email"
                      disabled={isLoading}
                      className="text-right"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="text-right">
                  <FormLabel>סיסמה</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="******"
                      type="password"
                      autoComplete="current-password"
                      disabled={isLoading}
                      className="text-right"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="px-0">
            <Button type="submit" className="w-full rtl-button" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" /> מתחבר...
                </>
              ) : (
                'התחבר'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default LoginForm;
