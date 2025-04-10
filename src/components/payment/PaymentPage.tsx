
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import CardcomIframeHandler from "@/components/payment/CardcomIframeHandler";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock, CreditCard, AlertCircle } from "lucide-react";

interface PaymentPageProps {
  userId: string;
  amount?: number;
  planId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  onSuccess?: (data: { transactionId: string; approvalNumber: string }) => void;
  onError?: (error: any) => void;
}

export default function PaymentPage({
  userId,
  amount = 9900,
  planId = "basic",
  firstName = "לקוח",
  lastName = "בדיקה",
  email = "test@example.com",
  phone = "0501234567",
  onSuccess,
  onError
}: PaymentPageProps) {
  const [iframeUrl, setIframeUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function createLowProfileDeal() {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase.functions.invoke('cardcom-lowprofile', {
          body: {
            userId,
            planId,
            amount,
            firstName,
            lastName,
            email,
            phone,
          }
        });
        
        if (error || !data?.iframeUrl) {
          console.error("Failed to create payment iframe:", error || "No iframe URL received");
          setError("שגיאה ביצירת עסקה. אנא נסה שוב מאוחר יותר.");
          onError?.(error || new Error("No iframe URL received"));
          return;
        }
        
        console.log("Iframe URL received:", data.iframeUrl);
        setIframeUrl(data.iframeUrl);
      } catch (err) {
        console.error("Exception creating payment iframe:", err);
        setError("שגיאת תקשורת. אנא נסה שוב מאוחר יותר.");
        onError?.(err);
      } finally {
        setLoading(false);
      }
    }
    
    createLowProfileDeal();
  }, [userId, amount, planId, firstName, lastName, email, phone, onError]);

  const handleToken = async (token: string) => {
    try {
      setProcessing(true);
      setError(null);
      
      console.log("Token received, processing payment:", token);
      
      const { data, error } = await supabase.functions.invoke('charge-token', {
        body: { token, amount, userId }
      });
      
      if (error) {
        console.error("Payment processing error:", error);
        setError("שגיאה בעיבוד התשלום. אנא נסה שוב.");
        onError?.(error);
        toast.error("שגיאה בעיבוד התשלום");
        return;
      }
      
      console.log("Payment result:", data);
      
      if (data.status === "approved") {
        toast.success("התשלום בוצע בהצלחה!");
        onSuccess?.({
          transactionId: data.transactionId || "",
          approvalNumber: data.approvalNumber || ""
        });
      } else {
        setError(`התשלום נדחה: ${data.reason || "סיבה לא ידועה"}`);
        toast.error(`התשלום נדחה: ${data.reason || "סיבה לא ידועה"}`);
        onError?.(new Error(data.reason || "Payment declined"));
      }
    } catch (err) {
      console.error("Exception processing payment:", err);
      setError("שגיאת תקשורת בעיבוד התשלום. אנא נסה שוב.");
      onError?.(err);
      toast.error("שגיאת תקשורת בעיבוד התשלום");
    } finally {
      setProcessing(false);
    }
  };

  const handleError = () => {
    setError("התהליך נכשל. אנא בדוק את פרטי התשלום ונסה שוב.");
    onError?.(new Error("Payment process failed"));
    toast.error("התהליך נכשל");
  };

  const retry = () => {
    setError(null);
    setLoading(true);
    window.location.reload();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardContent className="pt-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
            <p className="text-muted-foreground">טוען טופס תשלום מאובטח...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center text-center p-6">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">שגיאה בתהליך התשלום</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={retry}>נסה שוב</Button>
          </div>
        ) : (
          <>
            {processing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
                <div className="flex flex-col items-center text-center p-6">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
                  <h3 className="text-lg font-medium mb-2">מעבד תשלום</h3>
                  <p className="text-muted-foreground">אנא המתן...</p>
                </div>
              </div>
            )}
            
            {iframeUrl && (
              <div className="relative">
                <iframe
                  src={iframeUrl}
                  className="w-full min-h-[400px] border-0 rounded"
                  title="טופס תשלום מאובטח"
                />
                <CardcomIframeHandler onTokenReceived={handleToken} onError={handleError} />
              </div>
            )}
            
            <div className="flex items-center gap-2 mt-4 p-2 bg-primary/5 rounded-md border border-primary/10">
              <Lock className="h-4 w-4 text-green-600 flex-shrink-0" />
              <span className="text-xs text-muted-foreground">פרטי הכרטיס מאובטחים באמצעות SSL ולא נשמרים במערכת</span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
