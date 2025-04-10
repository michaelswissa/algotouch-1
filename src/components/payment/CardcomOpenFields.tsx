
import React, { useEffect, useState, useRef } from "react";
import { TokenData } from "@/types/payment";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

// Cardcom SDK URL - עדכון URL בהתאם למה שמוסופק על-ידי Cardcom
const CARDCOM_SDK_URLS = [
  "https://secure.cardcom.solutions/js/openfields.js",            // URL מקורי
  "https://secure.cardcom.co.il/js/openfields.js",                // URL חלופי 1
  "https://services.cardcom.co.il/js/openfields.js",              // URL חלופי 2
  "https://cdn.cardcom.co.il/js/tokenization/openfields.js"       // URL חלופי 3
];

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  onTokenReceived,
  onError,
  isProcessing
}) => {
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [cardholderName, setCardholderName] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [currentUrlIndex, setCurrentUrlIndex] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  const loadScript = (index = 0) => {
    if (index >= CARDCOM_SDK_URLS.length) {
      console.error("כל ניסיונות טעינת ה-SDK נכשלו");
      setErrorMsg("לא ניתן לטעון את מערכת התשלום. אנא נסה שוב מאוחר יותר או פנה לתמיכה.");
      onError(new Error("All Cardcom SDK load attempts failed"));
      return;
    }

    // בדיקה אם הסקריפט כבר נטען
    if (document.getElementById('cardcom-sdk')) {
      return;
    }

    setScriptLoading(true);
    const script = document.createElement('script');
    script.id = 'cardcom-sdk';
    script.src = CARDCOM_SDK_URLS[index];
    script.async = true;
    
    script.onload = () => {
      console.log("Cardcom SDK loaded successfully from:", CARDCOM_SDK_URLS[index]);
      setScriptLoaded(true);
      setScriptLoading(false);
      setErrorMsg("");
    };
    
    script.onerror = () => {
      console.error(`Failed to load Cardcom SDK from: ${CARDCOM_SDK_URLS[index]}`);
      // נסה URL הבא
      setCurrentUrlIndex(index + 1);
      loadScript(index + 1);
    };
    
    document.body.appendChild(script);
  };

  useEffect(() => {
    loadScript(0);
    
    return () => {
      // Cleanup function
      const script = document.getElementById('cardcom-sdk');
      if (script) {
        script.remove();
      }
    };
  }, []);

  const handleRetry = () => {
    // מסיר את הסקריפט הקיים ומנסה שוב
    const script = document.getElementById('cardcom-sdk');
    if (script) {
      script.remove();
    }
    setScriptLoaded(false);
    setErrorMsg("");
    loadScript(0);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    setErrorMsg("");
    
    if (!window.Cardcom) {
      const error = "מערכת התשלום לא נטענה כראוי. אנא נסה לרענן את הדף.";
      setErrorMsg(error);
      onError(new Error(error));
      return;
    }

    // בדיקה שהשדה של שם בעל הכרטיס מולא
    if (!cardholderName || cardholderName.trim().length < 2) {
      setErrorMsg("נא להזין שם בעל כרטיס תקין");
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
        let expMonth = 0;
        let expYear = 0;
        
        if (result.CardMonth && result.CardYear) {
          expMonth = parseInt(result.CardMonth, 10);
          expYear = parseInt(result.CardYear, 10);
          // אם השנה מגיעה בפורמט קצר (YY), המר ל-YYYY
          if (expYear < 100) {
            expYear += 2000;
          }
        }
        
        const tokenData: TokenData = {
          token: result.Token,
          cardLast4: result.LastFourDigits || "****",
          expMonth,
          expYear
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

  // אם יש שגיאה בטעינה, הצג הודעת שגיאה וכפתור לניסיון מחדש
  if (errorMsg && errorMsg.includes("לא ניתן לטעון את מערכת התשלום")) {
    return (
      <div className="w-full p-6 border border-red-300 rounded-md bg-red-50">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMsg}</AlertDescription>
        </Alert>
        <div className="text-sm text-gray-600 mb-4">
          <p>אירעה שגיאה בטעינת מערכת התשלום. אנא נסה שוב או פנה לתמיכה.</p>
        </div>
        <Button onClick={handleRetry} className="w-full">נסה שוב</Button>
      </div>
    );
  }

  return (
    <div className="w-full">
      {scriptLoading && !scriptLoaded && (
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
