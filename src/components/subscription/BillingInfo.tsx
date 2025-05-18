
import React from 'react';
import { Calendar, Settings, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BillingInfoProps {
  nextBillingDate: string;
  planPrice: string;
  currency?: string;
  hasError?: boolean;
}

const BillingInfo: React.FC<BillingInfoProps> = ({ 
  nextBillingDate, 
  planPrice,
  currency = '$',
  hasError = false
}) => {
  // Format display values with stronger fallbacks for missing data
  const displayDate = nextBillingDate || 'לא זמין';
  const displayPrice = planPrice || '--';
  const hasMissingData = !nextBillingDate || !planPrice || displayDate === 'לא זמין';
  
  return (
    <>
      {hasError && (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            שגיאה בטעינת נתוני החיוב. אנא נסה לרענן את הדף או צור קשר עם התמיכה.
          </AlertDescription>
        </Alert>
      )}

      {hasMissingData && !hasError && (
        <Alert variant="warning" className="mb-4">
          <AlertTriangle className="h-4 w-4 mr-2" />
          <AlertDescription>
            חלק מפרטי החיוב חסרים. ייתכן שיש בעיה בנתוני המנוי.
          </AlertDescription>
        </Alert>
      )}
      
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
        <Calendar className="h-5 w-5 text-primary flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium">החיוב הבא</h4>
          {nextBillingDate ? (
            <p className="text-sm text-muted-foreground">{displayDate}</p>
          ) : (
            <p className="text-sm text-red-500">תאריך החיוב הבא לא זמין. אנא צור קשר עם התמיכה.</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3 bg-muted/40 p-3 rounded-md">
        <Settings className="h-5 w-5 text-primary flex-shrink-0" />
        <div>
          <h4 className="text-sm font-medium">סכום החיוב</h4>
          {displayPrice !== '--' && nextBillingDate ? (
            <p className="text-sm text-muted-foreground">
              {`${currency}${displayPrice} בתאריך ${displayDate}`}
            </p>
          ) : (
            <p className="text-sm text-red-500">
              {displayPrice !== '--' ? 
                `${currency}${displayPrice} (תאריך חיוב לא זמין)` : 
                'סכום החיוב הבא לא זמין'}
            </p>
          )}
        </div>
      </div>
    </>
  );
};

export default BillingInfo;
