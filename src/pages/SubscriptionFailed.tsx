
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '@/components/Layout';
import { XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StorageService } from '@/services/storage/StorageService';
import { PaymentLogger } from '@/services/payment/PaymentLogger';

const SubscriptionFailed = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  useEffect(() => {
    // Get error from URL parameters
    const errorParam = searchParams.get('error');
    const lowProfileCode = searchParams.get('lowProfileCode');
    
    // Log the failure
    PaymentLogger.error('Payment failed', { 
      error: errorParam,
      lowProfileCode
    });
    
    // Update payment status in storage
    if (lowProfileCode) {
      StorageService.updatePaymentData({
        status: 'failed',
        lowProfileCode
      });
    }
    
    // Set the error message
    setError(errorParam === 'payment_failed' 
      ? 'העסקה נדחתה על ידי חברת האשראי' 
      : 'העסקה לא הושלמה');
      
  }, [searchParams]);

  return (
    <Layout className="py-8" hideSidebar={true}>
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-full mb-4">
            <XCircle className="h-8 w-8 text-red-600 dark:text-red-500" />
          </div>
          <h3 className="text-xl font-semibold mb-2">התשלום נכשל</h3>
          
          {error && <p className="text-red-500 mb-2">{error}</p>}
          
          <p className="text-muted-foreground">
            העסקה לא הושלמה. בדוק את פרטי כרטיס האשראי או נסה כרטיס אחר.
          </p>
          
          <div className="flex flex-row gap-2 mt-4">
            <Button onClick={() => navigate('/subscription')}>
              נסה שוב
            </Button>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              חזור לדף הבית
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SubscriptionFailed;
