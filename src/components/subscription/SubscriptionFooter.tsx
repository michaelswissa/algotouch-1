
import React from 'react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SubscriptionFooterProps {
  subscriptionId: string;
  status: string;
  planType: string;
  onCancelClick?: () => void;
}

const SubscriptionFooter: React.FC<SubscriptionFooterProps> = ({ 
  subscriptionId, 
  status, 
  planType,
  onCancelClick
}) => {
  const navigate = useNavigate();
  
  const isActive = status === 'active' || status === 'trial';
  const canUpgrade = isActive && planType !== 'vip';
  const canCancel = isActive && planType !== 'vip';
  
  const handleUpgrade = () => {
    navigate('/subscription');
  };
  
  return (
    <div className="flex flex-col sm:flex-row gap-3 justify-between mt-6">
      {canUpgrade && (
        <Button 
          variant="outline" 
          onClick={handleUpgrade}
          className="flex-1"
        >
          שדרג מנוי
        </Button>
      )}
      
      {canCancel && (
        <Button 
          variant="outline" 
          className="text-destructive hover:text-destructive-foreground hover:bg-destructive flex-1"
          onClick={onCancelClick}
        >
          בטל מנוי
        </Button>
      )}
      
      {!isActive && (
        <Button 
          variant="default" 
          onClick={() => navigate('/subscription')}
          className="flex-1"
        >
          {status === 'cancelled' ? 'חדש מנוי' : 'רכוש מנוי חדש'}
        </Button>
      )}
    </div>
  );
};

export default SubscriptionFooter;
