
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TokenData } from './utils/paymentHelpers';

interface RegisterUserParams {
  registrationData: any;
  tokenData: TokenData;
}

interface RegisterResult {
  success: boolean;
  userId?: string;
  error?: any;
}

export const registerUser = async ({ registrationData, tokenData }: RegisterUserParams): Promise<RegisterResult> => {
  try {
    const { data: userData, error: userError } = await supabase.auth.signUp({
      email: registrationData.email,
      password: registrationData.password,
      options: {
        data: {
          first_name: registrationData.userData.firstName,
          last_name: registrationData.userData.lastName,
          registration_complete: true,
          signup_step: 'completed',
          signup_date: new Date().toISOString()
        }
      }
    });
    
    if (userError) {
      throw userError;
    }
    
    if (!userData.user) {
      throw new Error('יצירת משתמש נכשלה');
    }

    // Add a delay to ensure the user is created before proceeding
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial
    
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        plan_type: registrationData.planId,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        payment_method: tokenData,
        contract_signed: true,
        contract_signed_at: new Date().toISOString()
      });
    
    if (subscriptionError) {
      console.error('Subscription error:', subscriptionError);
      throw subscriptionError;
    }
    
    await supabase.from('payment_history').insert({
      user_id: userData.user.id,
      subscription_id: userData.user.id,
      amount: 0,
      status: 'trial_started',
      payment_method: tokenData
    });
    
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: registrationData.userData.firstName,
        last_name: registrationData.userData.lastName,
        phone: registrationData.userData.phone
      })
      .eq('id', userData.user.id);
    
    if (profileError) {
      console.error('Error updating profile:', profileError);
    }
    
    return { success: true, userId: userData.user.id };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error };
  }
};
