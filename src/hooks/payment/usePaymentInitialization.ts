
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { PaymentStatus } from '@/components/payment/types/payment';

interface UsePaymentInitializationProps {
  planId: string;
  setState: (updater: any) => void;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
}

export const usePaymentInitialization = ({
  planId,
  setState,
  masterFrameRef
}: UsePaymentInitializationProps) => {
  const navigate = useNavigate();

  const initializePayment = async () => {
    setState(prev => ({ 
      ...prev, 
      paymentStatus: PaymentStatus.INITIALIZING 
    }));
    
    try {
      // Get registration data if available
      const registrationData = sessionStorage.getItem('registration_data');
      let userData = null;
      let userId = null;
      let userEmail = null;
      let fullName = '';
      
      // Check for authenticated user first
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is already authenticated
        userId = user.id;
        userEmail = user.email;
        fullName = user.user_metadata?.full_name || 
                 `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim();
        console.log("Using authenticated user for payment:", { userId, userEmail });
      } else if (registrationData) {
        // Handle registration data if user is not authenticated
        userData = JSON.parse(registrationData);
        userEmail = userData.email;
        fullName = userData.userData?.firstName && userData.userData?.lastName ? 
          `${userData.userData.firstName} ${userData.userData.lastName}` : userEmail;
        
        // Try to create user if not created already
        if (!userData.userCreated && userData.email && userData.password) {
          console.log("Creating new user account from registration data");
          try {
            const { data: authData, error: signUpError } = await supabase.auth.signUp({
              email: userData.email,
              password: userData.password,
              options: {
                data: {
                  first_name: userData.userData?.firstName,
                  last_name: userData.userData?.lastName,
                  phone: userData.userData?.phone,
                  full_name: `${userData.userData?.firstName || ''} ${userData.userData?.lastName || ''}`.trim()
                }
              }
            });
            
            if (!signUpError && authData.user) {
              // Mark user as created in registration data
              userData.userCreated = true;
              sessionStorage.setItem('registration_data', JSON.stringify(userData));
              userId = authData.user.id;
              console.log("User created successfully:", userId);
              
              // Sign in the user immediately
              await supabase.auth.signInWithPassword({
                email: userData.email,
                password: userData.password
              });
            } else {
              console.error("Error creating user account:", signUpError);
            }
          } catch (createError) {
            console.error("Error during account creation:", createError);
          }
        }
      }

      if (!userEmail) {
        console.error("No user email found for payment");
        throw new Error('חסרים פרטי משתמש לביצוע התשלום');
      }

      // Get contract data - required before payment
      const contractData = sessionStorage.getItem('contract_data');
      const contractDetails = contractData ? JSON.parse(contractData) : null;

      if (!contractDetails) {
        console.error("Missing contract data");
        toast.error('נדרשת חתימה על החוזה');
        navigate('/subscription');
        return;
      }

      // Prepare payment user info
      const paymentUser = {
        email: userEmail,
        fullName: fullName || userEmail
      };

      console.log("Initializing payment for:", {
        planId,
        email: paymentUser.email,
        fullName: paymentUser.fullName
      });

      // Call CardCom payment initialization Edge Function
      const { data, error } = await supabase.functions.invoke('cardcom-payment', {
        body: {
          planId,
          amount: planId === 'monthly' ? 371 : planId === 'annual' ? 3371 : 13121,
          invoiceInfo: {
            fullName: paymentUser.fullName || paymentUser.email,
            email: paymentUser.email,
          },
          currency: "ILS",
          operation: "ChargeAndCreateToken",
          redirectUrls: {
            success: `${window.location.origin}/subscription/success`,
            failed: `${window.location.origin}/subscription/failed`
          },
          userId: userId, // Pass userId if available
          registrationData: userData // Pass registration data if available
        }
      });
      
      if (error || !data?.success) {
        console.error("Payment initialization error:", error || data?.message);
        throw new Error(error?.message || data?.message || 'אירעה שגיאה באתחול התשלום');
      }
      
      console.log("Payment session created:", data.data);
      
      setState(prev => ({
        ...prev,
        sessionId: data.data.sessionId,
        lowProfileCode: data.data.lowProfileCode,
        terminalNumber: data.data.terminalNumber,
        cardcomUrl: data.data.cardcomUrl || 'https://secure.cardcom.solutions',
        paymentStatus: PaymentStatus.IDLE // Set to IDLE when ready for user input
      }));
      
      // Initialize CardCom fields with improved iframe handling
      initializeCardcomFields(data.data.lowProfileCode, data.data.sessionId);
      
      return { 
        lowProfileCode: data.data.lowProfileCode, 
        sessionId: data.data.sessionId 
      };
    } catch (error) {
      console.error('Payment initialization error:', error);
      toast.error(error.message || 'אירעה שגיאה באתחול התשלום');
      setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
      return null;
    }
  };

  // Improved initialization function with retry logic
  const initializeCardcomFields = (lowProfileCode: string, sessionId: string) => {
    if (!masterFrameRef.current) {
      console.error("Master frame ref not available");
      return;
    }

    // Function to check if iframe is loaded and ready
    const isFrameReady = () => {
      try {
        return !!masterFrameRef.current && !!masterFrameRef.current.contentWindow;
      } catch (e) {
        console.error("Error checking if frame is ready:", e);
        return false;
      }
    };

    // Function to send initialization message
    const sendInitMessage = () => {
      if (!isFrameReady()) return false;

      const initMessage = {
        action: 'init',
        lowProfileCode: lowProfileCode,
        sessionId: sessionId,
        cardFieldCSS: `
          input {
            font-family: 'Assistant', sans-serif;
            font-size: 16px;
            text-align: right;
            direction: rtl;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ccc;
            width: 100%;
            box-sizing: border-box;
          }
          input:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .invalid { 
            border: 2px solid #ef4444; 
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
          }
        `,
        cvvFieldCSS: `
          input {
            font-family: 'Assistant', sans-serif;
            font-size: 16px;
            text-align: center;
            padding: 8px 12px;
            border-radius: 4px;
            border: 1px solid #ccc;
            width: 100%;
            box-sizing: border-box;
          }
          input:focus {
            border-color: #3b82f6;
            outline: none;
            box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
          }
          .invalid { 
            border: 2px solid #ef4444;
            box-shadow: 0 0 0 2px rgba(239, 68, 68, 0.2);
          }
        `,
        language: "he"
      };
      
      try {
        console.log("Sending init message to iframe", {
          targetOrigin: 'https://secure.cardcom.solutions',
          hasLowProfileCode: !!initMessage.lowProfileCode,
          hasSessionId: !!initMessage.sessionId
        });
        
        masterFrameRef.current.contentWindow.postMessage(
          initMessage,
          'https://secure.cardcom.solutions'
        );
        return true;
      } catch (error) {
        console.error("Error sending init message to iframe:", error);
        return false;
      }
    };

    // Try to initialize with multiple attempts
    let attempts = 0;
    const maxAttempts = 5;
    
    const attemptInterval = setInterval(() => {
      console.log(`Initialization attempt ${attempts + 1} of ${maxAttempts}`);
      
      if (sendInitMessage() || attempts >= maxAttempts - 1) {
        clearInterval(attemptInterval);
        if (attempts >= maxAttempts - 1 && !sendInitMessage()) {
          console.error("Failed to initialize CardCom fields after maximum attempts");
          toast.error('אירעה שגיאה באתחול שדות התשלום');
          setState(prev => ({ ...prev, paymentStatus: PaymentStatus.FAILED }));
        }
      }
      attempts++;
    }, 1000);
  };

  return { initializePayment };
};
