
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { formAnimation, inputAnimation, buttonAnimation } from '@/components/ui/animations';
import { useAuth } from '@/contexts/auth';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { SignupFormData } from '@/types/auth';

// Signup form schema
const signupFormSchema = z.object({
  firstName: z.string().min(2, 'שם פרטי חייב להכיל לפחות 2 תווים'),
  lastName: z.string().min(2, 'שם משפחה חייב להכיל לפחות 2 תווים'),
  email: z.string().email('נדרשת כתובת אימייל תקינה'),
  password: z.string().min(6, 'הסיסמה חייבת להכיל לפחות 6 תווים'),
  phone: z.string().min(9, 'מספר טלפון חייב להכיל לפחות 9 ספרות').optional(),
});

type SignupFormValues = z.infer<typeof signupFormSchema>;

interface SignupFormProps {
  redirectTo?: string | null;
}

const SignupForm: React.FC<SignupFormProps> = ({ redirectTo }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();

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
      PaymentLogger.log('Starting signup submission', { email: values.email });
      
      const formData: SignupFormData = {
        email: values.email,
        password: values.password,
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
      };
      
      const { success, error } = await signUp(formData);

      if (error) {
        if (error.includes('already registered')) {
          toast.error('משתמש עם כתובת האימייל הזו כבר קיים במערכת');
        } else {
          toast.error(error || 'שגיאה בהרשמה');
        }
        return;
      }

      // For custom redirect flows, we might have already navigated in the signUp function
      if (redirectTo && success) {
        toast.success('נרשמת בהצלחה!');
      }
    } catch (error: any) {
      PaymentLogger.error('Signup submission error:', error);
      toast.error(error.message || 'שגיאה בהרשמה');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <Form {...form}>
        <motion.form 
          onSubmit={form.handleSubmit(onSubmit)} 
          dir="rtl"
          variants={formAnimation}
          initial="hidden"
          animate="visible"
        >
          <CardContent className="space-y-4 px-0">
            <motion.div variants={inputAnimation} className="grid grid-cols-2 gap-4">
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
            </motion.div>
            
            {/* Email field */}
            <motion.div variants={inputAnimation}>
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
            </motion.div>
            
            {/* Phone field */}
            <motion.div variants={inputAnimation}>
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
            </motion.div>
            
            {/* Password field */}
            <motion.div variants={inputAnimation}>
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
            </motion.div>
          </CardContent>
          <CardFooter className="px-0">
            <motion.div 
              className="w-full"
              variants={buttonAnimation}
              whileHover="hover"
              whileTap="tap"
            >
              <Button type="submit" className="w-full rtl-button" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" /> מעבד...
                  </>
                ) : (
                  'הירשם'
                )}
              </Button>
            </motion.div>
          </CardFooter>
        </motion.form>
      </Form>
    </Card>
  );
};

export default SignupForm;
