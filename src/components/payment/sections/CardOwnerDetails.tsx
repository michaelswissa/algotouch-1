
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

interface CardOwnerDetailsProps {
  cardholderName: string;
  cardOwnerId: string;
  email: string;
  phone: string;
  cardholderNameError?: string;
  idNumberError?: string;
  onCardholderNameChange: (value: string) => void;
  onCardOwnerIdChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  validateIdNumber: (value: string) => void;
}

const CardOwnerDetails: React.FC<CardOwnerDetailsProps> = ({
  cardholderName,
  cardOwnerId,
  email,
  phone,
  cardholderNameError,
  idNumberError,
  onCardholderNameChange,
  onCardOwnerIdChange,
  onEmailChange,
  onPhoneChange,
  validateIdNumber,
}) => {
  return (
    <div className="space-y-4" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="cardOwnerName">שם בעל הכרטיס</Label>
        <Input
          id="cardOwnerName"
          name="cardOwnerName"
          placeholder="ישראל ישראלי"
          value={cardholderName}
          onChange={(e) => onCardholderNameChange(e.target.value)}
          className={cardholderNameError ? 'border-red-500' : ''}
          required
        />
        {cardholderNameError && (
          <p className="text-sm text-red-500">{cardholderNameError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardOwnerId">תעודת זהות</Label>
        <Input
          id="cardOwnerId"
          name="cardOwnerId"
          placeholder="123456789"
          value={cardOwnerId}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, '');
            onCardOwnerIdChange(value);
            validateIdNumber(value);
          }}
          maxLength={9}
          className={idNumberError ? 'border-red-500' : ''}
          required
        />
        {idNumberError && (
          <p className="text-sm text-red-500">{idNumberError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardOwnerEmail">דוא"ל</Label>
        <Input
          id="cardOwnerEmail"
          name="cardOwnerEmail"
          type="email"
          placeholder="example@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="cardOwnerPhone">טלפון</Label>
        <Input
          id="cardOwnerPhone"
          name="cardOwnerPhone"
          placeholder="05xxxxxxxx"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          required
        />
      </div>
    </div>
  );
};

export default CardOwnerDetails;
