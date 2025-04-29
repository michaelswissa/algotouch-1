import React, { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CreditCard } from 'lucide-react';
import CardExpiryInputs from './CardExpiryInputs';
import SecurityNote from './SecurityNote';
import { usePaymentForm } from '@/hooks/payment/usePaymentForm';

interface PaymentDetailsProps {
  terminalNumber: string;
  cardcomUrl: string;
  masterFrameRef: React.RefObject<HTMLIFrameElement>;
  isReady?: boolean;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({ 
  terminalNumber, 
  cardcomUrl, 
  masterFrameRef,
  isReady = false
}) => {
  const { formData, errors, handleChange } = usePaymentForm();
  const [allFramesLoaded, setAllFramesLoaded] = useState(false);
  
  // Log for debugging
  useEffect(() => {
    if (isReady) {
      console.log('PaymentDetails component is ready with:', {
        terminalNumber,
        cardcomUrl,
        hasMasterFrameRef: !!masterFrameRef.current
      });
    }
  }, [isReady, terminalNumber, cardcomUrl, masterFrameRef]);
  
  return (
    <div className="space-y-4" dir="rtl">
      {/* Card Owner Name */}
      <div className="space-y-2">
        <Label htmlFor="cardOwnerName">שם בעל הכרטיס</Label>
        <Input
          id="cardOwnerName"
          name="cardOwnerName"
          placeholder="ישראל ישראלי"
          value={formData.cardOwnerName}
          onChange={handleChange}
          className={errors.cardOwnerName ? 'border-red-500' : ''}
          required
        />
        {errors.cardOwnerName && (
          <p className="text-sm text-red-500">{errors.cardOwnerName}</p>
        )}
      </div>

      {/* ID Number */}
      <div className="space-y-2">
        <Label htmlFor="cardOwnerId">תעודת זהות</Label>
        <Input
          id="cardOwnerId"
          name="cardOwnerId"
          placeholder="123456789"
          value={formData.cardOwnerId}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            const syntheticEvent = {
              ...e,
              target: {
                ...e.target,
                name: 'cardOwnerId',
                value
              }
            };
            handleChange(syntheticEvent as any);
          }}
          maxLength={9}
          className={errors.cardOwnerId ? 'border-red-500' : ''}
          required
        />
        {errors.cardOwnerId && (
          <p className="text-sm text-red-500">{errors.cardOwnerId}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="cardOwnerEmail">דוא"ל</Label>
        <Input
          id="cardOwnerEmail"
          name="cardOwnerEmail"
          type="email"
          placeholder="example@example.com"
          value={formData.cardOwnerEmail}
          onChange={handleChange}
          className={errors.cardOwnerEmail ? 'border-red-500' : ''}
          required
        />
        {errors.cardOwnerEmail && (
          <p className="text-sm text-red-500">{errors.cardOwnerEmail}</p>
        )}
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="cardOwnerPhone">טלפון</Label>
        <Input
          id="cardOwnerPhone"
          name="cardOwnerPhone"
          placeholder="05xxxxxxxx"
          value={formData.cardOwnerPhone}
          onChange={handleChange}
          className={errors.cardOwnerPhone ? 'border-red-500' : ''}
          required
        />
        {errors.cardOwnerPhone && (
          <p className="text-sm text-red-500">{errors.cardOwnerPhone}</p>
        )}
      </div>

      {/* Card Number Frame */}
      <div className="space-y-2">
        <Label htmlFor="CardNumberFrame">מספר כרטיס</Label>
        <div className="relative">
          <div 
            id="CardNumberFrame" 
            className="credit-card-field"
            style={{ height: '40px', width: '100%' }}
          />
          <div className="absolute top-0 right-0 h-full flex items-center pr-3 pointer-events-none">
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Card Expiry */}
      <CardExpiryInputs
        expiryMonth={formData.expirationMonth}
        expiryYear={formData.expirationYear}
        onMonthChange={(value) => {
          const e = {
            target: {
              name: 'expirationMonth',
              value
            }
          } as React.ChangeEvent<HTMLSelectElement>;
          handleChange(e);
        }}
        onYearChange={(value) => {
          const e = {
            target: {
              name: 'expirationYear',
              value
            }
          } as React.ChangeEvent<HTMLSelectElement>;
          handleChange(e);
        }}
        error={errors.expirationMonth || errors.expirationYear}
      />

      {/* CVV Frame */}
      <div className="space-y-2">
        <Label htmlFor="CVVFrame">קוד אבטחה (CVV)</Label>
        <div className="relative max-w-[188px]">
          <div 
            id="CVVFrame" 
            className="credit-card-field"
            style={{ height: '40px', width: '100%' }}
          />
        </div>
      </div>
      
      {/* reCAPTCHA Frame */}
      <div className="space-y-2">
        <div 
          id="ReCaptchaFrame"
          className="flex justify-start mt-2" 
          style={{ minHeight: '78px' }}
        />
      </div>

      {/* Master iframe - keep hidden but available for communication */}
      {isReady && (
        <div className="hidden">
          <iframe 
            id="CardComMasterFrame"
            ref={masterFrameRef}
            src={`${cardcomUrl}/Interface/LowProfile.aspx?TerminalNumber=${terminalNumber}`}
            title="CardCom Payment"
            style={{ width: '1px', height: '1px', border: 'none', position: 'absolute', top: '-9999px' }}
            onLoad={() => console.log('Master iframe loaded')}
          />
        </div>
      )}

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
