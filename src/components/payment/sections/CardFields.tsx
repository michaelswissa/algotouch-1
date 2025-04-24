
import React from 'react';
import { Label } from '@/components/ui/label';
import CardNumberFrame from '../iframes/CardNumberFrame';
import CVVFrame from '../iframes/CVVFrame';
import CardExpiryInputs from '../CardExpiryInputs';
import ReCaptchaFrame from '../iframes/ReCaptchaFrame';

interface CardFieldsProps {
  terminalNumber: string;
  cardcomUrl: string;
  isReady: boolean;
  expiryMonth: string;
  expiryYear: string;
  onMonthChange: (value: string) => void;
  onYearChange: (value: string) => void;
  onFieldLoad: (fieldName: string) => void;
  cardNumberError?: string;
  cvvError?: string;
  expiryError?: string;
  cardTypeInfo?: string;
}

const CardFields: React.FC<CardFieldsProps> = ({
  terminalNumber,
  cardcomUrl,
  isReady,
  expiryMonth,
  expiryYear,
  onMonthChange,
  onYearChange,
  onFieldLoad,
  cardNumberError,
  cvvError,
  expiryError,
  cardTypeInfo,
}) => {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="CardComCardNumber">מספר כרטיס</Label>
        <div className="relative">
          <CardNumberFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => onFieldLoad('cardNumber')}
            isReady={isReady}
          />
          {cardNumberError && (
            <p className="text-sm text-red-500">{cardNumberError}</p>
          )}
          {cardTypeInfo && (
            <p className="text-sm text-muted-foreground">
              סוג כרטיס: {cardTypeInfo}
            </p>
          )}
        </div>
      </div>

      <CardExpiryInputs
        expiryMonth={expiryMonth}
        expiryYear={expiryYear}
        onMonthChange={onMonthChange}
        onYearChange={onYearChange}
        error={expiryError}
      />

      <div className="space-y-2">
        <Label htmlFor="CardComCvv">קוד אבטחה (CVV)</Label>
        <div className="relative">
          <CVVFrame
            terminalNumber={terminalNumber}
            cardcomUrl={cardcomUrl}
            onLoad={() => onFieldLoad('cvv')}
            isReady={isReady}
          />
          {cvvError && (
            <p className="text-sm text-red-500">{cvvError}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <ReCaptchaFrame
          terminalNumber={terminalNumber}
          cardcomUrl={cardcomUrl}
          onLoad={() => {}}
        />
      </div>
    </div>
  );
};

export default CardFields;
