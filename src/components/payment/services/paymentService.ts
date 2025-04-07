
import { supabase } from '@/integrations/supabase/client';
import { TokenData } from '../utils/paymentHelpers';
import { RegistrationResult } from '../hooks/types';

export const handleExistingUserPayment = async (
  userId: string,
  planId: string,
  tokenData: TokenData,
  operationType: number,
  planDetails: any
) => {
  const now = new Date();
  let trialEndsAt = null;
  let periodEndsAt = null;
  
  if (planId === 'monthly') {
    trialEndsAt = new Date(now);
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1);
  } else if (planId === 'annual') {
    periodEndsAt = new Date(now);
    periodEndsAt.setFullYear(periodEndsAt.getFullYear() + 1);
  }
  
  const { error: subscriptionError } = await supabase
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_type: planId,
      status: planId === 'monthly' ? 'trial' : 'active',
      trial_ends_at: trialEndsAt?.toISOString() || null,
      current_period_ends_at: periodEndsAt?.toISOString() || null,
      payment_method: tokenData,
      contract_signed: true,
      contract_signed_at: now.toISOString()
    });
  
  if (subscriptionError) {
    throw new Error(`שגיאה בעדכון מנוי: ${subscriptionError.message}`);
  }
  
  const price = planDetails[planId as keyof typeof planDetails]?.price || 0;
  
  if (planId !== 'monthly' || operationType !== 3) {
    await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        subscription_id: userId,
        amount: price,
        currency: 'USD',
        status: 'completed',
        payment_method: {
          ...tokenData,
          simulated: false 
        }
      });
  } else {
    await supabase
      .from('payment_history')
      .insert({
        user_id: userId,
        subscription_id: userId,
        amount: 0,
        currency: 'USD',
        status: 'trial_started',
        payment_method: tokenData
      });
  }
};

export const registerNewUser = async (
  registrationData: any,
  tokenData: TokenData
): Promise<RegistrationResult> => {
  try {
    const { data, error } = await supabase.functions.invoke('register-user', {
      body: {
        registrationData,
        tokenData: {
          ...tokenData,
          simulated: false
        },
        contractDetails: registrationData.contractDetails || null
      }
    });
    
    if (error) {
      throw new Error(error.message);
    }
    
    if (!data?.success) {
      throw new Error(data?.error || 'שגיאה לא ידועה בתהליך ההרשמה');
    }
    
    if (registrationData.email && registrationData.password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: registrationData.email,
        password: registrationData.password
      });
      
      if (signInError) {
        console.error("Error signing in after registration:", signInError);
      }
    }
    
    sessionStorage.removeItem('registration_data');
    
    return { success: true, userId: data.userId };
  } catch (error: any) {
    console.error("Registration error:", error);
    
    const registrationError = new Error(error.message || 'שגיאה בתהליך ההרשמה');
    throw registrationError;
  }
};

export const initiateExternalPayment = async (
  planId: string, 
  user: any, 
  registrationData: any
) => {
  let operationType = 3; // Default: token creation only (for monthly with free trial)
  
  if (planId === 'annual') {
    operationType = 2; // Charge and create token for recurring payments
  } else if (planId === 'vip') {
    operationType = 1; // Charge only for one-time payment
  }

  const userInfo = user 
    ? { userId: user.id, email: user.email }
    : registrationData
      ? { 
          fullName: `${registrationData.userData?.firstName || ''} ${registrationData.userData?.lastName || ''}`.trim(),
          email: registrationData.email,
          registrationData
        }
      : { fullName: '', email: '' };

  const payload = {
    planId,
    ...userInfo,
    operationType,
    successRedirectUrl: `${window.location.origin}/subscription?step=4&success=true&plan=${planId}`,
    errorRedirectUrl: `${window.location.origin}/subscription?step=3&error=true&plan=${planId}`
  };

  const { data, error } = await supabase.functions.invoke('cardcom-payment/create-payment', {
    body: payload
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.url) {
    throw new Error('לא התקבלה כתובת תשלום מהשרת');
  }
  
  return data;
};
