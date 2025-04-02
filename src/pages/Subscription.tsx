
import React, { useEffect, useState } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import DigitalContractForm from '@/components/DigitalContractForm';
import PaymentForm from '@/components/PaymentForm';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Check, ChevronRight } from 'lucide-react';
import { Steps, Step } from '@/components/subscription/Steps';
import { supabase } from '@/integrations/supabase/client';

const Subscription = () => {
  const { planId } = useParams<{ planId: string }>();
  const { isAuthenticated, loading, user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<string | undefined>(planId);
  const [fullName, setFullName] = useState('');
  const [hasActiveSubscription, setHasActiveSubscription] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkSubscription = async () => {
      if (user?.id) {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setHasActiveSubscription(true);
        }
        
        // Get user profile for full name
        const { data: profile } = await supabase
          .from('profiles')
          .select('first_name, last_name')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          setFullName(`${profile.first_name || ''} ${profile.last_name || ''}`);
        }
      }
    };
    
    if (user) {
      checkSubscription();
    }
  }, [user]);

  // Redirect to login if not authenticated
  if (!loading && !isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  // Redirect to dashboard if already has subscription
  if (!loading && hasActiveSubscription) {
    return <Navigate to="/dashboard" replace />;
  }

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId);
    setCurrentStep(2);
  };

  const handleContractSign = () => {
    setCurrentStep(3);
  };

  const handlePaymentComplete = () => {
    setCurrentStep(4);
    
    // Redirect to dashboard after showing success
    setTimeout(() => {
      navigate('/dashboard');
    }, 3000);
  };

  return (
    <Layout className="py-8">
      <div className="max-w-5xl mx-auto px-4" dir="rtl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">הרשמה למנוי</h1>
          <p className="text-muted-foreground">בחר תכנית, חתום על חוזה והזן פרטי תשלום לאישור</p>
          
          <Steps currentStep={currentStep} className="mt-8">
            <Step title="בחירת תכנית" />
            <Step title="חתימה על הסכם" />
            <Step title="פרטי תשלום" />
            <Step title="אישור" />
          </Steps>
        </div>
        
        {currentStep === 1 && (
          <SubscriptionPlans onSelectPlan={handlePlanSelect} selectedPlanId={selectedPlan} />
        )}
        
        {currentStep === 2 && selectedPlan && (
          <DigitalContractForm onSign={handleContractSign} planId={selectedPlan} fullName={fullName} />
        )}
        
        {currentStep === 3 && selectedPlan && (
          <PaymentForm planId={selectedPlan} onPaymentComplete={handlePaymentComplete} />
        )}
        
        {currentStep === 4 && (
          <div className="max-w-md mx-auto bg-green-50 dark:bg-green-900/20 text-center p-8 rounded-xl border border-green-200 dark:border-green-800">
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-800/30 rounded-full flex items-center justify-center mb-4">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-800 dark:text-green-400 mb-2">
              הרשמה הושלמה בהצלחה!
            </h2>
            <p className="text-green-700 dark:text-green-300 mb-6">
              ברכות! נרשמת בהצלחה לתקופת ניסיון חינם. כעת יש לך גישה מלאה למערכת.
            </p>
            <Button onClick={() => navigate('/dashboard')} className="gap-2">
              המשך לדף הבית <ChevronRight className="h-4 w-4 -rotate-180" />
            </Button>
          </div>
        )}
        
        {currentStep > 1 && currentStep < 4 && (
          <div className="mt-6 flex justify-between">
            <Button variant="outline" onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}>
              חזור
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Subscription;
