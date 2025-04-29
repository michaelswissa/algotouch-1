
import React from 'react';
import { IframePaymentSection } from '@/components/payment';

interface IframePaymentStepProps {
  planId: string;
  onPaymentComplete: () => void;
  onBack?: () => void;
}

const IframePaymentStep: React.FC<IframePaymentStepProps> = ({ 
  planId, 
  onPaymentComplete, 
  onBack 
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4">
      <IframePaymentSection 
        planId={planId} 
        onPaymentComplete={onPaymentComplete} 
        onBack={onBack} 
      />
    </div>
  );
};

export default IframePaymentStep;
