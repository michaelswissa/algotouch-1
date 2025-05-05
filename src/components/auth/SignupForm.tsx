
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
import { StorageService } from '@/services/storage/StorageService';

// Signup form schema
const signupFormSchema = z.object({
  firstName: z.string().min(2, 'שם פרטי חייב להכיל לפחות 2 תווים'),
  lastName: z.string().min(2, 'שם משפחה חייב להכיל לפחות 2 תווים'),
  email: z.string().email('נדרשת כתובת אימייל תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  phone: z.string().min(9, 'מספר טלפון חייב להכיל לפחות 9 ספרות'),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

interface SignupFormProps {
  redirectTo?: string | null;
}

const SignupForm: React.FC<SignupFormProps> = ({ redirectTo }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      phone: '',
    },
  });

  const onSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      // Store registration data in session storage first
      StorageService.storeRegistrationData({
        email: values.email,
        password: values.password,
        userData: {
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone,
        },
        registrationTime: new Date().toISOString(),
      });

      // Check if we have a redirect parameter for post-payment flow
      if (redirectTo) {
        // Sign up the user immediately if we're in post-payment flow
        const { error } = await supabase.auth.signUp({
          email: values.email,
          password: values.password,
          options: {
            data: {
              first_name: values.firstName,
              last_name: values.lastName,
              phone: values.phone,
              full_name: `${values.firstName} ${values.lastName}`.trim(),
            },
          },
        });

        if (error) {
          throw error;
        }

        toast.success('נרשמת בהצלחה!');
        navigate(redirectTo, { replace: true });
      } else {
        // Otherwise, redirect to subscription flow
        navigate('/subscription', { 
          state: { isRegistering: true } 
        });
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      
      if (error.message?.includes('already registered')) {
        toast.error('משתמש עם כתובת האימייל הזו כבר קיים במערכת');
      } else {
        toast.error(error.message || 'שגיאה בהרשמה');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardHeader className="text-right px-0">
        <CardTitle>הרשמה</CardTitle>
        <CardDescription>צור חשבון חדש</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} dir="rtl">
          <CardContent className="space-y-4 px-0">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem className="text-right">
                    <FormLabel>שם פרטי</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ישראל"
                        autoComplete="given-name"
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
                name="lastName"
                render={({ field }) => (
                  <FormItem className="text-right">
                    <FormLabel>שם משפחה</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="ישראלי"
                        autoComplete="family-name"
                        disabled={isLoading}
                        className="text-right"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
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
              name="phone"
              render={({ field }) => (
                <FormItem className="text-right">
                  <FormLabel>טלפון</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="050-1234567"
                      type="tel"
                      autoComplete="tel"
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
                      autoComplete="new-password"
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
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" /> מעבד...
                </>
              ) : (
                'הירשם'
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
};

export default SignupForm;
