
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

interface ContractAgreementProps {
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  onTermsChange: (checked: boolean) => void;
  onPrivacyChange: (checked: boolean) => void;
}

const ContractAgreement: React.FC<ContractAgreementProps> = ({
  agreedToTerms,
  agreedToPrivacy,
  onTermsChange,
  onPrivacyChange
}) => {
  return (
    <div className="space-y-4 my-5 rtl">
      <div className="flex items-start space-x-2 space-x-reverse rtl">
        <Checkbox 
          id="terms" 
          checked={agreedToTerms}
          onCheckedChange={(checked) => onTermsChange(checked as boolean)}
          className="mt-1"
        />
        <div className="mr-2">
          <Label htmlFor="terms" className="font-medium">אני מאשר/ת כי קראתי את הסכם הרישיון במלואו</Label>
          <p className="text-sm text-muted-foreground mt-1">
            אני מבין/ה את כל תנאיו ומסכים/ה להם
          </p>
        </div>
      </div>

      <div className="flex items-start space-x-2 space-x-reverse rtl">
        <Checkbox 
          id="privacy" 
          checked={agreedToPrivacy}
          onCheckedChange={(checked) => onPrivacyChange(checked as boolean)}
          className="mt-1"
        />
        <div className="mr-2">
          <Label htmlFor="privacy" className="font-medium">אני מאשר/ת את מדיניות הפרטיות</Label>
          <p className="text-sm text-muted-foreground mt-1">
            אני מסכים/ה לעיבוד הנתונים שלי בהתאם למדיניות הפרטיות של החברה
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContractAgreement;
