
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

    // First, create temporary registration record in database to track this registration attempt
    const { data: tempRegistration, error: tempRegError } = await supabase
      .from('temp_registration_data')
      .insert({
        registration_data: {
          ...registrationData,
          tokenData: tokenData
        },
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
        used: false
      })
      .select('id')
      .single();
      
    if (tempRegError) {
      console.error('Error creating temporary registration record:', tempRegError);
      // Continue with registration attempt even if temp storage fails
    } else {
      console.log('Created temporary registration record:', tempRegistration.id);
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
    
    // Create the subscription record
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
    
    console.log('Subscription created successfully');
    
    // Create payment token record for future use
    if (tokenData && tokenData.token) {
      try {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 5); // 5 years validity for card token
        
        const { error: tokenError } = await supabase
          .from('recurring_payments')
          .insert({
            user_id: userData.user.id,
            token: tokenData.token,
            token_expiry: expiryDate.toISOString(),
            last_4_digits: tokenData.lastFourDigits,
            card_type: tokenData.cardType || 'unknown',
            status: 'active',
            token_approval_number: tokenData.approvalNumber,
            is_valid: true
          });
          
        if (tokenError) {
          console.error('Error storing payment token:', tokenError);
          // Non-critical error, continue with registration
        } else {
          console.log('Payment token stored successfully');
        }
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
      payment_method: tokenData
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
        
        // Store the contract signature
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
            user_agent: contractDetails.browserInfo?.userAgent || navigator.userAgent,
            browser_info: contractDetails.browserInfo || {
              language: navigator.language,
              platform: navigator.platform,
              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
            },
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

    // Mark temp registration as used if it exists
    if (tempRegistration?.id) {
      await supabase
        .from('temp_registration_data')
        .update({ used: true })
        .eq('id', tempRegistration.id);
    }
    
    return { 
      success: true, 
      userId: userData.user.id,
      registrationId: tempRegistration?.id
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return { success: false, error };
  }
};
