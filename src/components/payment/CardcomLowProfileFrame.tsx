
import React, { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { TokenData } from "@/types/payment";
import { supabase } from "@/integrations/supabase/client";

interface CardcomLowProfileFrameProps {
  onTokenReceived: (tokenData: TokenData) => void;
  onError: (error: any) => void;
  isProcessing: boolean;
}

const CardcomLowProfileFrame: React.FC<CardcomLowProfileFrameProps> = ({
  onTokenReceived,
  onError,
  isProcessing
}) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Create a low profile deal to get the iframe URL
    async function createLowProfileDeal() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.functions.invoke('create-lowprofile-deal', {
          body: { 
            amount: 100, // Will be replaced by actual amount in production
            returnUrl: window.location.origin + "/payment/success",
            cancelUrl: window.location.origin + "/payment/cancel",
            language: "he" // Hebrew
          }
        });
        
        if (error) {
          console.error("Error creating low profile deal:", error);
          setError("שגיאה ביצירת עסקה. אנא נסה שוב מאוחר יותר.");
          onError(new Error(`Failed to create low profile deal: ${error.message}`));
          return;
        }
        
        if (!data?.lowProfileUrl) {
          setError("לא התקבלה כתובת תקינה לטופס התשלום.");
          onError(new Error("No valid iframe URL received"));
          return;
        }
        
        console.log("Low Profile URL received:", data.lowProfileUrl);
        setIframeUrl(data.lowProfileUrl);
      } catch (err) {
        console.error("Exception creating low profile deal:", err);
        setError("שגיאת תקשורת. אנא נסה שוב מאוחר יותר.");
        onError(err);
      } finally {
        setLoading(false);
      }
    }
    
    createLowProfileDeal();
    
    // Setup message listener for the token from Cardcom iframe
    const handleMessage = (event: MessageEvent) => {
      // Make sure message is from Cardcom domain
      if (!event.origin.includes("cardcom.solutions")) {
        return;
      }
      
      console.log("Received message from iframe:", event.data);
      
      try {
        // Check if we received a token
        if (event.data?.Token) {
          const token = event.data.Token;
          const lastFourDigits = event.data.CardNumber || "****";
          const expiryMonth = parseInt(event.data.CardMonth || "0", 10);
          const expiryYear = parseInt(event.data.CardYear || "0", 10);
          const cardholderName = event.data.CardOwnerName || "";
          
          console.log("Token received:", { token, lastFourDigits });
          
          // Create token data object
          const tokenData: TokenData = {
            token,
            lastFourDigits,
            expiryMonth,
            expiryYear,
            cardholderName
          };
          
          onTokenReceived(tokenData);
        } 
        // Handle errors
        else if (event.data?.Error) {
          setError(`שגיאה בעיבוד כרטיס האשראי: ${event.data.Error}`);
          onError(new Error(event.data.Error));
        }
      } catch (err) {
        console.error("Error handling postMessage:", err);
        setError("שגיאה בעיבוד תשובת מערכת התשלום.");
        onError(err);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onTokenReceived, onError]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
        <p className="mt-4 text-muted-foreground">טוען טופס תשלום מאובטח...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-r-4 border-red-500 p-4 rounded mb-4">
        <p className="text-red-700">{error}</p>
        <button 
          className="mt-2 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded"
          onClick={() => window.location.reload()}
        >
          נסה שוב
        </button>
      </div>
    );
  }

  if (!iframeUrl) {
    return (
      <div className="bg-yellow-50 border-r-4 border-yellow-500 p-4 rounded">
        <p className="text-yellow-700">לא התקבלה כתובת תקינה לטופס התשלום.</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-md border border-gray-200" style={{ height: "400px" }}>
        {isProcessing && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-10">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div>
              <p className="mt-4 text-muted-foreground">מעבד תשלום...</p>
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
      
      <div className="flex items-center gap-2 mt-4 text-sm text-muted-foreground bg-primary/5 p-2 px-3 rounded-md border border-primary/10">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <span>פרטי הכרטיס מאובטחים באמצעות הצפנת SSL ולא נשמרים במערכת</span>
      </div>
    </div>
  );
};

export default CardcomLowProfileFrame;
