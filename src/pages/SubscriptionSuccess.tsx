import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/card';
import { StorageService } from '@/services/storage/StorageService';
import { CardComRedirectService } from '@/services/payment/CardComRedirectService';
import { RegistrationService } from '@/services/registration/RegistrationService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth';
import { supabase } from '@/integrations/supabase/client';

enum VerificationStatus {
  CHECKING = 'checking',
  SUCCESS = 'success',
  FAILED = 'failed',
  CREATING_ACCOUNT = 'creating_account',
  ACCOUNT_CREATED = 'account_created',
  ACCOUNT_CREATION_FAILED = 'account_creation_failed'
}

const SubscriptionSuccess = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<VerificationStatus>(VerificationStatus.CHECKING);
  const [error, setError] = useState<string | null>(null);
  const [planId, setPlanId] = useState<string>('');
  const navigate = useNavigate();
  const { user: authUser, isAuthenticated, loading, signIn } = useAuth();
  
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        console.log("Starting payment verification process");
        
        // Get lowProfileCode from URL
        const lowProfileCode = searchParams.get('lowProfileCode');
        
        if (!lowProfileCode) {
          console.error("Missing lowProfileCode in URL parameters");
          setError('חסר קוד זיהוי עסקה');
          setStatus(VerificationStatus.FAILED);
          return;
        }
        
        // Get stored payment data
        const paymentData = StorageService.getPaymentData();
        const paymentIntent = StorageService.getRegistrationIntent();
        
        console.log("Stored payment data:", paymentData);
        console.log("Payment intent:", paymentIntent);
        
        // Verify the payment status
        const verificationResult = await CardComRedirectService.verifyPaymentStatus(lowProfileCode);
        
        console.log("Payment verification result:", verificationResult);
        
        if (!verificationResult.success) {
          console.error("Payment verification failed:", verificationResult.error);
          setError(verificationResult.error || 'העסקה לא אושרה');
          setStatus(VerificationStatus.FAILED);
          StorageService.updatePaymentData({ status: 'failed' });
          return;
        }
        
        // Update payment status in storage
        StorageService.updatePaymentData({
          status: 'completed',
          lowProfileCode,
          transactionId: verificationResult.transactionId,
          timestamp: new Date().toISOString()
        });
        
        // Get plan ID from payment intent or stored payment data
        const resolvedPlanId = paymentIntent?.planId || paymentData?.reference || '';
        setPlanId(resolvedPlanId);
        
        console.log("Resolved plan ID:", resolvedPlanId);
        
        // If user is already authenticated, we're done
        if (isAuthenticated && authUser) {
          console.log("User is already authenticated:", authUser);
          setStatus(VerificationStatus.SUCCESS);
          return;
        }
        
        // Get registration data
        const registrationData = StorageService.getRegistrationData();
        console.log("Registration data:", registrationData);
        
        if (!registrationData.email || !registrationData.password) {
          console.error("Missing required registration data");
          setError('מידע הרשמה חסר');
          setStatus(VerificationStatus.ACCOUNT_CREATION_FAILED);
          return;
        }
        
        // Create user account from registration data
        setStatus(VerificationStatus.CREATING_ACCOUNT);
        
        // First try to sign in to see if account exists
        console.log("Checking if account exists - attempting sign in");
        
        try {
          const signInResult = await supabase.auth.signInWithPassword({
            email: registrationData.email,
            password: registrationData.password
          });
          
          if (!signInResult.error) {
            console.log("Account exists and sign in successful");
            setStatus(VerificationStatus.ACCOUNT_CREATED);
            setTimeout(() => {
              setStatus(VerificationStatus.SUCCESS);
            }, 1000);
            return;
          }
          
          console.log("Account doesn't exist or sign in failed - creating new account");
        } catch (signInError) {
          console.error("Error during sign in check:", signInError);
          // Continue to account creation
        }
        
        // Try to create account
        const { success, user: createdUser, error: registrationError } = await RegistrationService.createUserAccount({
          email: registrationData.email,
          password: registrationData.password,
          userData: registrationData.userData || {},
          planId: registrationData.planId || resolvedPlanId,
          contractSigned: registrationData.contractSigned,
          registrationTime: registrationData.registrationTime || new Date().toISOString(),
          userId: registrationData.userId,
          userCreated: registrationData.userCreated
        });
        
        console.log("Account creation result:", { success, userId: createdUser?.id, error: registrationError });
        
        if (!success || !createdUser) {
          setError(registrationError || 'שגיאה ביצירת חשבון');
          setStatus(VerificationStatus.ACCOUNT_CREATION_FAILED);
          return;
        }
        
        // Explicitly sign in the user to ensure they're authenticated
        console.log("Account created successfully, signing in user");
        const { success: signInSuccess } = await RegistrationService.signInUser(
          registrationData.email, 
          registrationData.password
        );
        
        if (!signInSuccess) {
          console.error("Failed to sign in after account creation");
          setError('נוצר חשבון אך לא ניתן להתחבר אוטומטית');
          setStatus(VerificationStatus.ACCOUNT_CREATION_FAILED);
          return;
        }
        
        setStatus(VerificationStatus.ACCOUNT_CREATED);
        setTimeout(() => {
          setStatus(VerificationStatus.SUCCESS);
        }, 1500);
        
      } catch (error) {
        console.error("Unexpected error during payment verification flow:", error);
        PaymentLogger.error('Error verifying payment:', error);
        setError(error instanceof Error ? error.message : 'שגיאה בתהליך אימות התשלום');
        setStatus(VerificationStatus.FAILED);
      }
    };
    
    if (!loading) {
      verifyPayment();
    }
  }, [searchParams, isAuthenticated, authUser, loading]);
  
  // Rest of the component to render UI based on status
  const renderContent = () => {
    switch (status) {
      case VerificationStatus.CHECKING:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">מאמת את התשלום...</h3>
            <p className="text-muted-foreground">אנא המתן בזמן שאנו מאמתים את פרטי התשלום</p>
          </div>
        );
      
      case VerificationStatus.CREATING_ACCOUNT:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <h3 className="text-xl font-semibold mb-2">יוצר את החשבון שלך...</h3>
            <p className="text-muted-foreground">אנא המתן בזמן שאנו מגדירים את החשבון שלך</p>
          </div>
        );
        
      case VerificationStatus.ACCOUNT_CREATED:
        return (
          <div className="flex flex-col items-center justify-center py-8">
            <CheckCircle className="h-8 w-8 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">החשבון נוצר בהצלחה!</h3>
            <p className="text-muted-foreground">החשבון שלך הוגדר בהצלחה</p>
          </div>
        );
      
      case VerificationStatus.SUCCESS:
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">התשלום התקבל בהצלחה!</h3>
            <p className="text-muted-foreground">
              {planId === 'vip' 
                ? 'המנוי שלך הופעל לכל החיים'
                : `המנוי שלך הופעל ויחודש אוטומטית בכל ${planId === 'monthly' ? 'חודש' : 'שנה'}`}
            </p>
            <Button onClick={() => navigate('/dashboard', { replace: true })} className="mt-4">
              המשך למערכת
            </Button>
          </div>
        );
        
      case VerificationStatus.FAILED:
      case VerificationStatus.ACCOUNT_CREATION_FAILED:
        return (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
              <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {status === VerificationStatus.FAILED ? 'התשלום נכשל' : 'שגיאה ביצירת החשבון'}
            </h3>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <p className="text-muted-foreground">
              {status === VerificationStatus.FAILED
                ? 'לא הצלחנו לאמת את התשלום שלך. נסה שנית או צור קשר עם התמיכה.'
                : 'לא הצלחנו ליצור את החשבון שלך. נסה להתחבר או לבצע הרשמה מחדש.'}
            </p>
            <div className="flex flex-row gap-2 mt-4">
              <Button onClick={() => navigate('/subscription')} className="mt-4">
                נסה שוב
              </Button>
              <Button variant="outline" onClick={() => navigate('/auth')} className="mt-4">
                התחבר
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout className="py-8" hideSidebar={true}>
      <div className="max-w-md mx-auto">
        {renderContent()}
      </div>
    </Layout>
  );
};

export default SubscriptionSuccess;
