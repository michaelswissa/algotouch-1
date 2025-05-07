
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCcw, XCircle } from "lucide-react";

interface ErrorRecoveryInfoProps {
  error?: string | null;
  isRecovering?: boolean;
  onRetry?: () => void;
}

const ErrorRecoveryInfo = ({ error, isRecovering, onRetry }: ErrorRecoveryInfoProps) => {
  if (!error && !isRecovering) return null;
  
  return (
    <div dir="rtl" className="my-4">
      {isRecovering ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertTitle>נמצא מידע להשלמת העסקה</AlertTitle>
          <AlertDescription>
            נמצאו פרטי תשלום שנשמרו בעסקה קודמת שלא הושלמה. 
            אנא המשך את תהליך התשלום.
          </AlertDescription>
        </Alert>
      ) : error ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertTitle>שגיאה בתהליך התשלום</AlertTitle>
          <AlertDescription>
            {error}
            {onRetry && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2 ml-auto"
                onClick={onRetry}
              >
                <RefreshCcw className="mr-2 h-3 w-3" />
                נסה שנית
              </Button>
            )}
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
};

export default ErrorRecoveryInfo;
