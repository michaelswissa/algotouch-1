
import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';

interface PaymentDetailsProps {
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  lowProfileCode?: string;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ 
  terminalNumber, 
  lowProfileCode
}) => {
  const [iframeLoaded, setIframeLoaded] = useState(false);

  if (!lowProfileCode) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4" dir="rtl">
      <div className="relative min-h-[400px] border rounded-md overflow-hidden">
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 dark:bg-gray-800">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}
        
        <iframe
          src={`https://secure.cardcom.solutions/External/LowProfile/LowProfileClearing/${terminalNumber}.aspx?LowProfileCode=${lowProfileCode}`}
          style={{
            width: '100%',
            height: '500px',
            border: 'none'
          }}
          onLoad={() => setIframeLoaded(true)}
          title="CardCom Payment"
        />
      </div>
    </div>
  );
};

export default PaymentDetails;
