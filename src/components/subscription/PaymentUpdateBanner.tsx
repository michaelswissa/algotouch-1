
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEnhancedSubscription } from '@/contexts/subscription/EnhancedSubscriptionContext';

const PaymentUpdateBanner = () => {
  const navigate = useNavigate();
  const { status, showPaymentUpdateBanner, dismissPaymentBanner } = useEnhancedSubscription();
  
  if (!showPaymentUpdateBanner || !status?.requiresPaymentUpdate) {
    return null;
  }
  
  return (
    <div className="bg-red-50 text-red-800 px-4 py-3 flex items-center justify-between border-b border-red-200" dir="rtl">
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <span className="text-sm font-medium">
          {status.gracePeriodDays 
            ? `נדרש עדכון פרטי תשלום. תקופת חסד: ${status.gracePeriodDays} ימים נותרו.`
            : 'נדרש עדכון פרטי תשלום בדחיפות. הגישה לחשבונך תיחסם בקרוב.'}
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="bg-white hover:bg-white text-red-600 border-red-200"
          onClick={() => navigate('/update-payment')}
        >
          עדכן עכשיו
        </Button>
        
        <button 
          className="p-1 rounded-full hover:bg-red-100 transition-colors"
          onClick={dismissPaymentBanner}
          aria-label="סגור"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default PaymentUpdateBanner;
