
import React from 'react';
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
  const { formData, errors, handleChange, handleSubmitPayment, isSubmitting } = usePaymentForm();
  
  return (
    <div className="space-y-4" dir="rtl">
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

      <div className="space-y-2">
        <Label htmlFor="cardNumber">מספר כרטיס</Label>
        <div className="relative">
          <Input
            id="cardNumber"
            name="cardNumber"
            placeholder="**** **** **** ****"
            className="bg-gray-50"
            disabled
            required
          />
          <div className="absolute top-0 right-0 h-full flex items-center pr-3 pointer-events-none">
            <CreditCard className="h-5 w-5 text-gray-400" />
          </div>
        </div>
        <p className="text-sm text-muted-foreground">מספר הכרטיס יוזן בצורה מאובטחת בעמוד התשלום</p>
      </div>

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

      <div className="space-y-2">
        <Label htmlFor="cvv">קוד אבטחה (CVV)</Label>
        <div className="relative">
          <Input
            id="cvv"
            name="cvv"
            placeholder="***"
            className="bg-gray-50"
            disabled
            required
            maxLength={4}
          />
        </div>
        <p className="text-sm text-muted-foreground">קוד האבטחה יוזן בצורה מאובטחת בעמוד התשלום</p>
      </div>

      {isReady && (
        <div className="mt-6">
          <iframe 
            ref={masterFrameRef}
            src={`${cardcomUrl}/Interface/MasterPage.aspx?TerminalNumber=${terminalNumber}&nocss=true`}
            title="CardCom Payment"
            className="w-full h-0"
            style={{ border: 'none' }}
          />
        </div>
      )}

      <SecurityNote />
    </div>
  );
};

export default PaymentDetails;
