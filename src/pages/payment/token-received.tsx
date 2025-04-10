
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

export default function TokenReceived() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<string>("processing");

  useEffect(() => {
    const token = searchParams.get("Token") || searchParams.get("LowProfileCode");
    const failed = searchParams.get("status") === "fail";

    console.log("Token received page loaded", { token, failed });

    if (token) {
      // Send token to parent window using postMessage
      window.parent.postMessage({ type: "CARD_TOKEN_RECEIVED", token }, "*");
      setStatus("success");
    } else if (failed) {
      window.parent.postMessage({ type: "CARD_TOKEN_FAILED" }, "*");
      setStatus("failed");
    } else {
      setStatus("invalid");
    }

    // Close this window or redirect after a short delay
    setTimeout(() => {
      try {
        if (window.opener) {
          window.close();
        } else {
          // If can't close (might be in iframe), redirect to parent
          window.location.href = "/";
        }
      } catch (e) {
        console.error("Could not close window", e);
      }
    }, 1500);
  }, [searchParams]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      {status === "processing" && (
        <>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mb-4"></div>
          <h2 className="text-xl font-medium">מעבד תשלום...</h2>
        </>
      )}

      {status === "success" && (
        <>
          <div className="bg-green-100 p-4 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-medium">פרטי תשלום התקבלו</h2>
          <p className="text-sm text-muted-foreground mt-2">מחזיר אותך לדף התשלום...</p>
        </>
      )}

      {status === "failed" && (
        <>
          <div className="bg-red-100 p-4 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-medium">שגיאה בתהליך התשלום</h2>
          <p className="text-sm text-muted-foreground mt-2">מחזיר אותך לדף התשלום...</p>
        </>
      )}

      {status === "invalid" && (
        <>
          <div className="bg-yellow-100 p-4 rounded-full mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-medium">בקשה לא תקינה</h2>
          <p className="text-sm text-muted-foreground mt-2">חוזר לדף הבית...</p>
        </>
      )}
    </div>
  );
}
