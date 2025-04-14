
import React from 'react';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PaymentDetailsProps {
  cardNumber: string;
  setCardNumber: (value: string) => void;
  cardholderName: string;
  setCardholderName: (value: string) => void;
  expiryDate: string;
  setExpiryDate: (value: string) => void;
  cvv: string;
  setCvv: (value: string) => void;
}

const PaymentDetails: React.FC<PaymentDetailsProps> = ({
  cardNumber,
  setCardNumber,
  cardholderName,
  setCardholderName,
  expiryDate,
  setExpiryDate,
  cvv,
  setCvv
}) => {
  return (
    <div className="space-y-6" dir="rtl">
      <div className="space-y-2">
        <Label htmlFor="card-number">מספר כרטיס</Label>
        <Input
          id="card-number"
          placeholder="0000 0000 0000 0000"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          className="text-lg text-right"
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="cardholder-name">שם בעל הכרטיס</Label>
        <Input
          id="cardholder-name"
          placeholder="שם מלא כפי שמופיע על הכרטיס"
          value={cardholderName}
          onChange={(e) => setCardholderName(e.target.value)}
          className="text-right"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="expiry-date">תוקף</Label>
          <Input
            id="expiry-date"
            placeholder="MM/YY"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="text-right"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="cvv">קוד אבטחה (CVV)</Label>
          <Input
            id="cvv"
            placeholder="3 ספרות"
            value={cvv}
            onChange={(e) => setCvv(e.target.value)}
            className="text-right"
          />
        </div>
      </div>
    </div>
  );
};

export default PaymentDetails;
