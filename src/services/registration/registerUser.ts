
import { supabase } from '@/integrations/supabase/client';
import { TokenData, RegistrationData, ContractSignatureData } from '@/types/payment';

interface RegisterUserParams {
  registrationData: RegistrationData;
  tokenData: TokenData;
  contractDetails?: ContractSignatureData | null;
}

interface RegisterResult {
  success: boolean;
  userId?: string;
  error?: any;
  registrationId?: string;
}

/**
 * Registers a new user with subscription information
 * @param params Registration parameters
 * @returns Registration result
 */
export const registerUser = async ({ 
  registrationData, 
  tokenData, 
  contractDetails 
}: RegisterUserParams): Promise<RegisterResult> => {
  try {
    // Input validation
    if (!registrationData?.email || !registrationData?.password) {
      throw new Error('חסרים פרטי התחברות');
    }
    
    if (!registrationData.userData?.firstName || !registrationData.userData?.lastName) {
      throw new Error('חסרים פרטי משתמש');
    }

    console.log('Starting user registration:', {
      email: registrationData.email,
      firstName: registrationData.userData.firstName,
      planId: registrationData.planId,
      hasToken: !!tokenData?.token
    });

    // Create a temp registration ID to track this attempt
    let tempRegistrationId = '';
    
    // First, store registration data in a simpler way with payment_logs instead
    try {
      const { data, error } = await supabase.from('payment_logs').insert({
        user_id: 'temp', // Will be updated later with real user ID
        transaction_id: 'registration_' + Date.now(),
        amount: 0,
        payment_status: 'registration_started',
        currency: 'ILS',
        plan_id: registrationData.planId || 'unknown',
        payment_data: {
          email: registrationData.email,
          plan_id: registrationData.planId,
          timestamp: new Date().toISOString(),
          token_last4: tokenData.lastFourDigits
        }
      }).select('id').single();
      
      if (!error && data) {
        tempRegistrationId = data.id;
        console.log('Created temporary registration record:', tempRegistrationId);
      }
    } catch (err) {
      // Non-critical error, continue with registration
      console.warn('Failed to create temp registration log:', err);
    }

    // Create the user account
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
      console.error('User creation error:', userError);
      throw userError;
    }
    
    if (!userData.user) {
      throw new Error('יצירת משתמש נכשלה');
    }

    console.log('User created successfully:', userData.user.id);

    // Add a delay to ensure the user record is propagated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const trialEndsAt = new Date();
    trialEndsAt.setMonth(trialEndsAt.getMonth() + 1); // 1 month trial
    
    // Create the subscription record - Convert TokenData to a regular object for storage
    const paymentMethodData = {
      token: tokenData.token,
      lastFourDigits: tokenData.lastFourDigits,
      expiryMonth: tokenData.expiryMonth,
      expiryYear: tokenData.expiryYear,
      cardholderName: tokenData.cardholderName,
      cardType: tokenData.cardType || 'unknown'
    };
    
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: userData.user.id,
        plan_type: registrationData.planId,
        status: 'trial',
        trial_ends_at: trialEndsAt.toISOString(),
        payment_method: paymentMethodData, // Using the simplified object
        contract_signed: true,
        contract_signed_at: new Date().toISOString()
      });
    
    if (subscriptionError) {
      console.error('Subscription error:', subscriptionError);
      throw subscriptionError;
    }
    
    console.log('Subscription created successfully');
    
    // Create payment token record for future use
    if (tokenData && tokenData.token) {
      try {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 5); // 5 years validity for card token
        
        // Insert token data into recurring_payments table
        await supabase.from('recurring_payments').insert({
          user_id: userData.user.id,
          token: tokenData.token.toString(), // Ensure it's a string
          token_expiry: expiryDate.toISOString(),
          last_4_digits: tokenData.lastFourDigits,
          card_type: tokenData.cardType?.toString() || 'unknown',
          status: 'active',
          token_approval_number: tokenData.approvalNumber?.toString(),
          is_valid: true
        });
          
        console.log('Payment token stored successfully');
      } catch (tokenStoreError) {
        console.error('Exception storing token:', tokenStoreError);
        // Continue with registration even if token storage fails
      }
    }
    
    // Create payment history record
    await supabase.from('payment_history').insert({
      user_id: userData.user.id,
      subscription_id: userData.user.id,
      amount: 0,
      status: 'trial_started',
      payment_method: paymentMethodData // Using the simplified object
    });
    
    // Update profile information
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
      // Continue anyway as this is not critical
    }
    
    // Store contract signature if available
    if (contractDetails?.contractHtml && contractDetails?.signature) {
      try {
        // Get client IP address (will be missing in development, that's ok)
        let ipAddress = null;
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
          }
        } catch (e) {
          console.log('Could not get IP address, continuing without it');
        }
        
        // Store the contract signature with simplified browser_info
        const browserInfo = {
          language: contractDetails.browserInfo?.language || navigator.language,
          platform: contractDetails.browserInfo?.platform || navigator.platform,
          timeZone: contractDetails.browserInfo?.timeZone || 
            Intl.DateTimeFormat().resolvedOptions().timeZone,
          userAgent: contractDetails.browserInfo?.userAgent || navigator.userAgent
        };
        
        const { error: signatureError } = await supabase
          .from('contract_signatures')
          .insert({
            user_id: userData.user.id,
            plan_id: registrationData.planId,
            full_name: `${registrationData.userData.firstName} ${registrationData.userData.lastName}`,
            email: registrationData.email,
            phone: registrationData.userData.phone || null,
            signature: contractDetails.signature,
            contract_html: contractDetails.contractHtml,
            ip_address: ipAddress,
            user_agent: browserInfo.userAgent,
            browser_info: browserInfo,
            contract_version: contractDetails.contractVersion || "1.0",
            agreed_to_terms: contractDetails.agreedToTerms || false,
            agreed_to_privacy: contractDetails.agreedToPrivacy || false,
          });
          
        if (signatureError) {
          console.error('Error storing contract signature:', signatureError);
          // We don't throw here, as this is not critical to the registration process
        } else {
          console.log('Contract signature stored successfully');
        }
      } catch (signatureError) {
        console.error('Exception storing signature:', signatureError);
        // Continue with registration even if there's an error storing the contract
      }
    }

    // Update our temporary payment log with the real user ID
    if (tempRegistrationId) {
      await supabase.from('payment_logs')
        .update({ 
          user_id: userData.user.id,
          payment_data: {
            status: 'completed',
            user_created: true,
            timestamp: new Date().toISOString()
          }
        })
        .eq('id', tempRegistrationId);
    }
    
    return { 
      success: true, 
      userId: userData.user.id,
      registrationId: tempRegistrationId
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error };
  }
};
