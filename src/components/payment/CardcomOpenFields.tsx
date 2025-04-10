
import React, { useEffect, useState, useRef } from "react";
import { TokenData } from "@/types/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock } from "lucide-react";

type CardcomOpenFieldsProps = {
  onTokenReceived: (tokenData: TokenData) => void;
  onError: (error: any) => void;
  isProcessing: boolean;
};

declare global {
  interface Window {
    Cardcom?: {
      tokenize: (options: {
        cardNumberSelector: string;
        expirySelector: string;
        cvcSelector: string;
        success: (result: any) => void;
        error: (err: any) => void;
      }) => void;
    };
  }
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  onTokenReceived,
  onError,
  isProcessing
}) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Load Cardcom SDK if not already loaded
    if (!document.getElementById('cardcom-sdk')) {
      const script = document.createElement('script');
      script.id = 'cardcom-sdk';
      script.src = 'https://secure.cardcom.solutions/js/openfields.js';
      script.async = true;
      script.onload = () => {
        console.log("Cardcom SDK loaded successfully");
        setScriptLoaded(true);
      };
      script.onerror = () => {
        console.error("Failed to load Cardcom SDK");
        setErrorMsg("שגיאה בטעינת מערכת התשלום");
        onError(new Error("Failed to load Cardcom SDK"));
      };
      document.body.appendChild(script);
    } else {
      setScriptLoaded(true);
    }

    return () => {
      // Cleanup function if needed
    };
  }, [onError]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrorMsg("");
    
    if (!window.Cardcom) {
      const error = "מערכת התשלום לא נטענה כראוי. אנא נסה לרענן את הדף.";
      setErrorMsg(error);
      onError(new Error(error));
      return;
    }

    // Perform tokenization
    window.Cardcom.tokenize({
      cardNumberSelector: "#card-number",
      expirySelector: "#card-expiry",
      cvcSelector: "#card-cvc",
      success: (result) => {
        console.log("Tokenization successful", result);
        
        // Parse the expiry date (MM/YY format)
        let expiryMonth = 0;
        let expiryYear = 0;
        
        if (result.CardMonth && result.CardYear) {
          expiryMonth = parseInt(result.CardMonth, 10);
          expiryYear = parseInt(result.CardYear, 10);
        }
        
        const tokenData: TokenData = {
          token: result.Token,
          lastFourDigits: result.LastFourDigits || "****",
          expiryMonth,
          expiryYear,
          cardholderName
        };
        
        onTokenReceived(tokenData);
      },
      error: (err) => {
        console.error("Tokenization failed", err);
        let errorMessage = "שגיאה בעיבוד פרטי התשלום";
        
        if (err && err.message) {
          if (err.message.includes("invalid card number")) {
            errorMessage = "מספר הכרטיס אינו תקין";
          } else if (err.message.includes("expired")) {
            errorMessage = "תוקף הכרטיס אינו תקין";
          } else if (err.message.includes("cvv")) {
            errorMessage = "קוד האבטחה אינו תקין";
          }
        }
        
        setErrorMsg(errorMessage);
        onError(err);
      },
    });
  };

  return (
    <div className="w-full">
      {!scriptLoaded && (
        <div className="flex flex-col items-center justify-center py-6">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          <p className="mt-2 text-sm text-muted-foreground">טוען מערכת תשלומים...</p>
        </div>
      )}

      <form 
        ref={formRef}
        onSubmit={handleSubmit} 
        className={`space-y-4 ${!scriptLoaded ? 'opacity-50' : ''}`}
      >
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="cardholder-name">שם בעל הכרטיס</Label>
            <Input
              id="cardholder-name"
              placeholder="ישראל ישראלי"
              value={cardholderName}
              onChange={(e) => setCardholderName(e.target.value)}
              disabled={isProcessing || !scriptLoaded}
              required
              className="bg-white"
              dir="rtl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="card-number">מספר כרטיס</Label>
            <Input
              id="card-number"
              placeholder="0000 0000 0000 0000"
              disabled={isProcessing || !scriptLoaded}
              required
              className="bg-white"
              dir="ltr"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="card-expiry">תוקף</Label>
              <Input
                id="card-expiry"
                placeholder="MM/YY"
                disabled={isProcessing || !scriptLoaded}
                required
                className="bg-white"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="card-cvc">קוד אבטחה</Label>
              <Input
                id="card-cvc"
                placeholder="CVC"
                disabled={isProcessing || !scriptLoaded}
                required
                className="bg-white"
                dir="ltr"
              />
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border-r-4 border-red-500 p-3 rounded">
            <p className="text-red-700 text-sm">{errorMsg}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground bg-primary/5 p-2 px-3 rounded-md border border-primary/10">
          <Lock className="h-4 w-4 text-green-600 flex-shrink-0" />
          <span>פרטי הכרטיס מאובטחים באמצעות הצפנת SSL</span>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isProcessing || !scriptLoaded}
        >
          {isProcessing ? 'מעבד תשלום...' : 'המשך לתשלום מאובטח'}
        </Button>
      </form>
    </div>
  );
};

export default CardcomOpenFields;
