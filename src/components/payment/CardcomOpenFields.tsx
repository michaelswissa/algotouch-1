
import React, { useEffect, useState, useRef } from "react";
import { TokenData } from "@/types/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type CardcomOpenFieldsProps = {
  onTokenReceived: (tokenData: TokenData) => void;
  onError: (error: any) => void;
  isProcessing: boolean;
};

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  onTokenReceived,
  onError,
  isProcessing
}) => {
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);

  useEffect(() => {
    // Create the low profile deal to get the iframe URL
    async function createLowProfileDeal() {
      try {
        setLoading(true);
        setErrorMsg("");
        
        // Call the edge function to create a low profile deal
        const { data, error } = await supabase.functions.invoke('create-lowprofile-deal', {
          body: {
            amount: 100, // Will be replaced with actual amount in production
            returnUrl: window.location.origin + "/payment/success",
            cancelUrl: window.location.origin + "/payment/cancel",
            language: "he" // Hebrew
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
    
    // Setup message listener for iframe communication
    const handleMessage = (event: MessageEvent) => {
      // Make sure message is from Cardcom domain
      if (!event.origin.includes("cardcom")) {
        return;
      }
      
      console.log("Received message from iframe:", event.data);
      
      try {
        // Handle processing status
        if (event.data?.Status === "processing") {
          console.log("Payment processing...");
          return;
        }
        
        // Handle token
        if (event.data?.Token) {
          const token = event.data.Token;
          const lastFourDigits = event.data.CardNumber || "****";
          const expiryMonth = parseInt(event.data.CardMonth || "0", 10);
          const expiryYear = parseInt(event.data.CardYear || "0", 10);
          const cardholderName = event.data.CardOwnerName || "";
          
          console.log("Token received:", { token, lastFourDigits });
          
          // Create token data
          const tokenData: TokenData = {
            token,
            lastFourDigits,
            expiryMonth,
            expiryYear,
            cardholderName
          };
          
          // Verify payment with server
          if (lowProfileId) {
            verifyPaymentStatus(lowProfileId, tokenData);
          } else {
            // Direct token handling
            onTokenReceived(tokenData);
          }
        }
        // Handle errors
        else if (event.data?.Error) {
          console.error("Payment error:", event.data.Error);
          setErrorMsg(`שגיאה בעיבוד התשלום: ${event.data.Error}`);
          onError(new Error(event.data.Error));
        }
      } catch (err) {
        console.error("Error handling iframe message:", err);
        setErrorMsg("שגיאה בעיבוד תשובת מערכת התשלום");
        onError(err);
      }
    };
    
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onTokenReceived, onError]);

  // Verify payment status with server
  const verifyPaymentStatus = async (lowProfileId: string, tokenData: TokenData) => {
    try {
      const { data, error } = await supabase.functions.invoke('verify-lowprofile-payment', {
        body: { lowProfileId }
      });
      
      if (error) {
        console.error("Error verifying payment:", error);
        setErrorMsg("שגיאה באימות התשלום");
        onError(error);
        return;
      }
      
      console.log("Payment verification result:", data);
      
      if (data.success) {
        // Payment successful
        onTokenReceived(tokenData);
      } else {
        // Payment failed
        setErrorMsg(`שגיאה בעיבוד התשלום: ${data.message || "בדוק את פרטי הכרטיס"}`);
        onError(new Error(data.message));
      }
    } catch (err) {
      console.error("Exception verifying payment:", err);
      setErrorMsg("שגיאה באימות התשלום");
      onError(err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-sm text-muted-foreground">טוען טופס תשלום מאובטח...</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {errorMsg && (
        <div className="bg-red-50 border-r-4 border-red-500 p-3 rounded mb-4">
          <p className="text-red-700 text-sm">{errorMsg}</p>
          <button 
            className="mt-2 px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
            onClick={() => window.location.reload()}
          >
            נסה שוב
          </button>
        </div>
      )}

      {!errorMsg && iframeUrl && (
        <div className="relative bg-white rounded-lg border border-gray-200 overflow-hidden" style={{ height: "400px" }}>
          {isProcessing && (
            <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
                <p className="mt-4 text-sm text-muted-foreground">מעבד תשלום...</p>
              </div>
            </div>
          )}
          
          <iframe
            ref={iframeRef}
            src={iframeUrl}
            width="100%"
            height="100%"
            className="border-0"
            title="Cardcom Payment Form"
            sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
          />
        </div>
      )}
      
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground bg-primary/5 p-2 px-3 rounded-md border border-primary/10">
        <Lock className="h-4 w-4 text-green-600 flex-shrink-0" />
        <span>פרטי הכרטיס מאובטחים באמצעות הצפנת SSL ולא נשמרים במערכת</span>
      </div>
    </div>
  );
}

export default CardcomOpenFields;
