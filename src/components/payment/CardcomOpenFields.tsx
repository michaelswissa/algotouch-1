
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';

interface CardcomOpenFieldsProps {
  planId: string;
  planName: string;
  amount: number;
  onSuccess: (transactionId: string) => void;
  onError?: (error: string) => void;
  onCancel?: () => void;
  onPaymentStart?: () => void;
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  planId,
  planName,
  amount,
  onSuccess,
  onError,
  onCancel,
  onPaymentStart
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lowProfileId, setLowProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Create unique frame IDs for this instance
  const masterFrameId = `CardComMasterFrame_${Math.random().toString(36).substring(2, 9)}`;
  const cardNumberFrameId = `CardComCardNumber_${Math.random().toString(36).substring(2, 9)}`;
  const cvvFrameId = `CardComCvv_${Math.random().toString(36).substring(2, 9)}`;

  // Create the LP (Low Profile) page in Cardcom
  useEffect(() => {
    const createLowProfile = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would be a server call to your backend
        // which then calls Cardcom API to create a Low Profile page
        // For now, we'll simulate this with a timeout
        
        // Simulating API call to create Low Profile page
        setTimeout(() => {
          // Store a fake LP ID in session storage
          const fakeLpId = `lp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
          sessionStorage.setItem('payment_lowProfileId', fakeLpId);
          sessionStorage.setItem('payment_planId', planId);
          
          setLowProfileId(fakeLpId);
          setIsLoading(false);
        }, 1000);
        
      } catch (err) {
        setIsLoading(false);
        setError('שגיאה ביצירת עמוד התשלום. אנא נסה שנית.');
        if (onError) onError('שגיאה ביצירת עמוד התשלום');
      }
    };
    
    createLowProfile();
  }, [planId, onError]);

  // Handle iframe message events
  useEffect(() => {
    if (!lowProfileId) return;
    
    const handleMessage = (event: MessageEvent) => {
      // In a real implementation, we would validate the origin
      
      try {
        const data = event.data;
        
        // Check if this is a message from our iframe
        if (data && data.action) {
          console.log('Received message from iframe:', data);
          
          switch (data.action) {
            case 'HandleSubmit':
              // Payment submission started
              if (onPaymentStart) onPaymentStart();
              break;
              
            case 'HandleSuccess':
              // Payment successful
              if (onSuccess) {
                const transactionId = data.transactionId || lowProfileId;
                onSuccess(transactionId);
              }
              break;
              
            case 'HandleError':
              // Payment error
              if (onError) onError(data.message || 'שגיאה בתהליך התשלום');
              setError(data.message || 'שגיאה בתהליך התשלום');
              break;
          }
        }
      } catch (err) {
        console.error('Error processing iframe message:', err);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [lowProfileId, onSuccess, onError, onPaymentStart]);

  // Simulate successful payment (for demo purposes)
  const handleSimulateSuccess = () => {
    if (onPaymentStart) onPaymentStart();
    
    // Simulate processing
    setIsLoading(true);
    
    setTimeout(() => {
      setIsLoading(false);
      if (lowProfileId) {
        onSuccess(lowProfileId);
      } else {
        const fakeLpId = `lp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        onSuccess(fakeLpId);
      }
    }, 2000);
  };

  const handleCancelClick = () => {
    if (onCancel) onCancel();
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-md">
          {error}
        </div>
      )}
      
      <Card className="relative overflow-hidden">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium">מנוי {planName}</h3>
              <p className="text-sm text-muted-foreground">סכום לתשלום: ₪{amount.toLocaleString()}</p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Spinner className="w-8 h-8" />
              <span className="sr-only">טוען...</span>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid gap-4">
                <div>
                  <label htmlFor={cardNumberFrameId} className="block text-sm font-medium mb-1">
                    מספר כרטיס
                  </label>
                  <div className="h-10 border border-input bg-background rounded-md px-3">
                    {/* This would be an iframe in the real implementation */}
                    <div id={cardNumberFrameId} className="w-full h-full">
                      {/* Card number iframe would be loaded here */}
                      <input 
                        type="text" 
                        placeholder="**** **** **** ****" 
                        className="w-full h-full bg-transparent border-none focus:outline-none" 
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      תוקף
                    </label>
                    <input 
                      type="text" 
                      placeholder="MM/YY" 
                      className="h-10 w-full border border-input bg-background rounded-md px-3"
                      disabled={isLoading}
                    />
                  </div>
                  
                  <div>
                    <label htmlFor={cvvFrameId} className="block text-sm font-medium mb-1">
                      קוד אבטחה (CVV)
                    </label>
                    <div className="h-10 border border-input bg-background rounded-md px-3">
                      {/* This would be an iframe in the real implementation */}
                      <div id={cvvFrameId} className="w-full h-full">
                        {/* CVV iframe would be loaded here */}
                        <input 
                          type="text" 
                          placeholder="***" 
                          className="w-full h-full bg-transparent border-none focus:outline-none" 
                          disabled={isLoading} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">
                    שם בעל הכרטיס
                  </label>
                  <input 
                    type="text" 
                    className="h-10 w-full border border-input bg-background rounded-md px-3"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    תעודת זהות
                  </label>
                  <input 
                    type="text" 
                    className="h-10 w-full border border-input bg-background rounded-md px-3"
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="flex justify-between pt-2">
                <Button variant="outline" onClick={handleCancelClick} disabled={isLoading}>
                  בטל
                </Button>
                <Button onClick={handleSimulateSuccess} disabled={isLoading}>
                  {isLoading ? 'מעבד תשלום...' : 'בצע תשלום'}
                </Button>
              </div>
            </div>
          )}

          {/* This div would contain the master iframe in a real implementation */}
          <div id={masterFrameId} style={{ display: 'none' }}></div>
        </CardContent>
      </Card>
      
      <p className="text-xs text-center text-muted-foreground">
        התשלום מאובטח באמצעות חיבור מוצפן בתקן PCI DSS
      </p>
    </div>
  );
};

export default CardcomOpenFields;
