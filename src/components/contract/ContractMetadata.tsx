
import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ContractMetadataProps {
  fullName: string;
  onFullNameChange?: (value: string) => void;
  email: string;
  onEmailChange?: (value: string) => void;
  phone: string;
  onPhoneChange?: (value: string) => void;
  idNumber: string;
  onIdNumberChange?: (value: string) => void;
  readOnly?: boolean;
}

const ContractMetadata: React.FC<ContractMetadataProps> = ({
  fullName,
  onFullNameChange,
  email,
  onEmailChange,
  phone,
  onPhoneChange,
  idNumber,
  onIdNumberChange,
  readOnly = false
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rtl">
      <div className="space-y-2">
        <Label htmlFor="fullName" className="text-right">שם מלא</Label>
        <Input
          id="fullName"
          value={fullName}
          onChange={e => onFullNameChange?.(e.target.value)}
          className="text-right"
          readOnly={readOnly}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email" className="text-right">דוא"ל</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={e => onEmailChange?.(e.target.value)}
          className="text-right"
          readOnly={readOnly}
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone" className="text-right">טלפון</Label>
        <Input
          id="phone"
          type="tel"
          value={phone}
          onChange={e => onPhoneChange?.(e.target.value)}
          className="text-right"
          readOnly={readOnly}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="idNumber" className="text-right">מספר ת.ז</Label>
        <Input
          id="idNumber"
          value={idNumber}
          onChange={e => onIdNumberChange?.(e.target.value)}
          className="text-right"
          readOnly={readOnly}
        />
      </div>
    </div>
  );
};

export default ContractMetadata;
