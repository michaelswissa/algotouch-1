import React from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { useSignupForm } from '@/hooks/auth/useSignupForm';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/auth';

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

const formAnimation = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: {
      duration: 0.3,
      staggerChildren: 0.07,
      when: "beforeChildren"
    }
  }
};

const inputAnimation = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 }
};

const SignupForm: React.FC<SignupFormProps> = ({ redirectTo }) => {
  const { signUp } = useAuth();
  const { handleSignup, isProcessing } = useSignupForm();

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
    // If we have a redirect parameter for post-payment flow, use the direct signup
    if (redirectTo) {
      try {
        const result = await signUp({
          email: values.email,
          password: values.password,
          firstName: values.firstName,
          lastName: values.lastName,
          phone: values.phone
        });
        
        if (result.success && result.user) {
          // Redirect handled in the signUp function
        }
      } catch (error) {
        console.error("Signup error in redirectTo flow:", error);
      }
    } else {
      // Otherwise use our registration flow
      await handleSignup(values);
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
                        disabled={isProcessing}
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
                        disabled={isProcessing}
                        className="text-right"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
            
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
                        disabled={isProcessing}
                        className="text-right"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
            
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
                        disabled={isProcessing}
                        className="text-right"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </motion.div>
            
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
                        disabled={isProcessing}
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
              variants={inputAnimation}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button type="submit" className="w-full rtl-button" disabled={isProcessing}>
                {isProcessing ? (
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
