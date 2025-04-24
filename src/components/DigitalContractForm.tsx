
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import SignaturePad from '@/components/signature/SignaturePad';
import { contractTemplates } from '@/lib/contracts/contract-service';

interface DigitalContractFormProps {
  onSign: (contractData: any) => void;
  planId?: string;
  fullName?: string;
}

const DigitalContractForm: React.FC<DigitalContractFormProps> = ({
  onSign,
  planId = 'monthly',
  fullName = ''
}) => {
  // Explicitly import useState from React to prevent the null error
  const [signature, setSignature] = useState<string>('');
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState<boolean>(false);
  const [name, setName] = useState<string>(fullName || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  
  // Get the contract template based on plan type
  const contractTemplate = contractTemplates[planId] || contractTemplates.monthly;
  const contractVersion = '1.0';
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signature) {
      alert('יש לחתום על החוזה לפני שליחה');
      return;
    }
    
    if (!agreedToTerms || !agreedToPrivacy) {
      alert('יש לאשר את התנאים ומדיניות הפרטיות');
      return;
    }
    
    if (!name.trim()) {
      alert('יש למלא את השם המלא');
      return;
    }
    
    setIsSubmitting(true);
    
    // Prepare browser info for audit
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timestamp: new Date().toISOString()
    };
    
    // Create contract data to be signed
    const contractData = {
      fullName: name,
      signature,
      agreedToTerms,
      agreedToPrivacy,
      contractVersion,
      contractHtml: contractTemplate,
      signedAt: new Date().toISOString(),
      browserInfo
    };
    
    // Send signed contract data to parent
    onSign(contractData);
    setIsSubmitting(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white rounded-lg border p-4 max-h-96 overflow-y-auto mb-4" dir="rtl">
        <div dangerouslySetInnerHTML={{ __html: contractTemplate }} />
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">שם מלא</Label>
          <input
            type="text"
            id="fullName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded p-2"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label>חתימה</Label>
          <SignaturePad
            onChange={setSignature}
            width={350}
            height={150}
          />
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Checkbox 
            id="terms" 
            checked={agreedToTerms} 
            onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
          />
          <Label htmlFor="terms" className="text-sm">
            אני מסכים/ה <a href="/terms" target="_blank" className="text-primary hover:underline">לתנאי השימוש</a>
          </Label>
        </div>
        
        <div className="flex items-center space-x-2 space-x-reverse">
          <Checkbox 
            id="privacy" 
            checked={agreedToPrivacy} 
            onCheckedChange={(checked) => setAgreedToPrivacy(checked === true)}
          />
          <Label htmlFor="privacy" className="text-sm">
            אני מסכים/ה <a href="/privacy" target="_blank" className="text-primary hover:underline">למדיניות הפרטיות</a>
          </Label>
        </div>
        
        <Button 
          type="submit" 
          disabled={isSubmitting || !agreedToTerms || !agreedToPrivacy || !signature || !name.trim()}
          className="w-full"
        >
          {isSubmitting ? 'מעבד חתימה...' : 'חתום ואשר חוזה'}
        </Button>
      </div>
    </form>
  );
};

export default DigitalContractForm;
