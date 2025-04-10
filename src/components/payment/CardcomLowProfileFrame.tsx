
import React, { useEffect, useState } from "react";
import { TokenData } from "@/types/payment";
import { supabase } from "@/integrations/supabase/client";
import { Lock } from "lucide-react";
import CardcomIframeHandler from "./CardcomIframeHandler";

type CardcomLowProfileFrameProps = {
  onTokenReceived: (tokenData: TokenData) => void;
  onError: (error: any) => void;
  isProcessing: boolean;
};

export default function CardcomLowProfileFrame({ 
  onTokenReceived, 
  onError, 
  isProcessing 
}: CardcomLowProfileFrameProps) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);

  // Create a LowProfile deal to get the iframe URL
  useEffect(() => {
    async function createLowProfileDeal() {
      try {
        setLoading(true);
        setErrorMsg(null);
        
        // Get current user session (if any)
        const { data: { session } } = await supabase.auth.getSession();
        const userId = session?.user?.id || crypto.randomUUID();
        
        // Call the Edge function to create a low profile deal
        const { data, error } = await supabase.functions.invoke('create-lowprofile-deal', {
          body: {
            amount: 100, // Sample amount, will be replaced with actual amount in production
            returnUrl: window.location.origin + "/payment/token-received",
            cancelUrl: window.location.origin + "/payment/token-received?status=fail",
            language: "he", // Hebrew
            customerId: userId,
            fullName: session?.user?.user_metadata?.full_name || "",
            email: session?.user?.email || "",
          }
        });
        
        if (error) {
          console.error("Failed to create payment session:", error);
          setErrorMsg("שגיאה ביצירת עסקה. אנא נסה שוב מאוחר יותר.");
          onError(error);
          return;
        }
        
        if (!data?.lowProfileUrl || !data?.lowProfileId) {
          setErrorMsg("לא התקבלה כתובת תקינה לטופס התשלום");
          onError(new Error("No valid iframe URL or LowProfile ID received"));
          return;
        }
        
        console.log("Low profile data received:", data);
        setIframeUrl(data.lowProfileUrl);
        setLowProfileId(data.lowProfileId);
      } catch (err) {
        console.error("Exception creating low profile deal:", err);
        setErrorMsg("שגיאת תקשורת. אנא נסה שוב מאוחר יותר.");
        onError(err);
      } finally {
        setLoading(false);
      }
    }
    
    createLowProfileDeal();
  }, [onError]);

  // Handle token received from the iframe via postMessage
  const handleTokenReceived = (token: string) => {
    console.log("Token received in CardcomLowProfileFrame:", token);
    
    // Create token data object
    const tokenData: TokenData = {
      token,
      lastFourDigits: "****", // Will be updated after payment processing
      expiryMonth: 0,         // Will be updated after payment processing
      expiryYear: 0,          // Will be updated after payment processing
    };
    
    // Pass the token back to parent component
    onTokenReceived(tokenData);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">טוען טופס תשלום מאובטח...</p>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
        <h3 className="text-red-700 dark:text-red-400 font-medium mb-2">שגיאה בטעינת טופס התשלום</h3>
        <p className="text-red-600 dark:text-red-300 text-sm mb-3">{errorMsg}</p>
        <button 
          className="px-4 py-1 text-sm bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 rounded hover:bg-red-200 dark:hover:bg-red-700 transition-colors"
          onClick={() => window.location.reload()}
        >
          נסה שוב
        </button>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden" style={{ height: "500px" }}>
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 dark:bg-gray-800/80 flex items-center justify-center z-10 backdrop-blur-sm">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-sm font-medium">מעבד תשלום...</p>
            </div>
          </div>
        )}
        
        {iframeUrl && (
          <iframe
            src={iframeUrl}
            width="100%"
            height="100%"
            className="border-0"
            title="Cardcom Payment Form"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
          />
        )}
        
        <CardcomIframeHandler onTokenReceived={handleTokenReceived} onError={() => onError(new Error('תהליך התשלום נכשל'))} />
      </div>
      
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground bg-primary/5 p-2 px-3 rounded-md border border-primary/10">
        <Lock className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span>פרטי הכרטיס מאובטחים באמצעות הצפנת SSL ולא נשמרים במערכת</span>
      </div>
    </div>
  );
}
