
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ContractDisplay from '@/components/contract/ContractDisplay';
import ContractAgreement from '@/components/contract/ContractAgreement';
import ContractMetadata from '@/components/contract/ContractMetadata';
import { Separator } from '@/components/ui/separator';
import EnhancedSignaturePad from '@/components/contract/EnhancedSignaturePad';
import { toast } from 'sonner';

interface DigitalContractFormProps {
  onSign: (contractData: any) => void;
  planId: string;
  fullName?: string;
  email?: string;
}

const DigitalContractForm: React.FC<DigitalContractFormProps> = ({
  onSign,
  planId,
  fullName: initialFullName = '',
  email: initialEmail = ''
}) => {
  const [contractText, setContractText] = useState('');
  const [signature, setSignature] = useState<string>('');
  const [fullName, setFullName] = useState(initialFullName);
  const [email, setEmail] = useState(initialEmail);
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [contractVersion] = useState('1.0');

  useEffect(() => {
    // Load the contract text
    const loadContractText = async () => {
      try {
        const planType = planId === 'monthly' ? 'monthly' : 'annual';
        const contractUrl = `/contracts/contract-${planType}.txt`;
        const response = await fetch(contractUrl);
        const text = await response.text();
        setContractText(text);
      } catch (error) {
        console.error('Error loading contract text:', error);
        setContractText('שגיאה בטעינת החוזה. אנא נסה שנית.');
      }
    };

    loadContractText();
  }, [planId]);

  const handleSign = () => {
    if (!signature) {
      toast.error('אנא חתום בתיבת החתימה');
      return;
    }

    if (!fullName || !email) {
      toast.error('אנא מלא את שמך המלא וכתובת האימייל');
      return;
    }

    if (!agreedToTerms || !agreedToPrivacy) {
      toast.error('אנא אשר את תנאי ההסכם ומדיניות הפרטיות');
      return;
    }

    // Create HTML version of the contract for storage/display
    const contractHtml = generateContractHtml(
      contractText,
      fullName,
      email,
      signature,
      new Date().toISOString()
    );

    // Browser information for legal purposes
    const browserInfo = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    // Data to be sent to the parent component
    const contractData = {
      contractHtml,
      signature,
      fullName,
      email,
      phone,
      idNumber,
      agreedToTerms,
      agreedToPrivacy,
      contractVersion,
      browserInfo,
      planId
    };

    onSign(contractData);
  };

  const generateContractHtml = (
    text: string,
    name: string,
    userEmail: string,
    sig: string,
    timestamp: string
  ): string => {
    // Format the date in Hebrew
    const dateObj = new Date(timestamp);
    const hebrewDate = new Intl.DateTimeFormat('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(dateObj);

    // Convert the contract text to HTML
    const htmlParagraphs = text
      .split('\n')
      .map(paragraph => {
        if (!paragraph.trim()) return '<div class="my-2"></div>';
        
        // Handle section headers (numbered sections)
        if (/^\d+\./.test(paragraph.trim())) {
          return `<h3 class="text-lg font-bold mt-6 mb-3">${paragraph}</h3>`;
        } 
        // Handle subsections (like 1.1, 2.3 etc)
        else if (/^\d+\.\d+/.test(paragraph.trim())) {
          return `<h4 class="text-base font-semibold mt-4 mb-2">${paragraph}</h4>`;
        } 
        // Regular paragraph
        return `<p class="mb-3 leading-relaxed">${paragraph}</p>`;
      })
      .join('');

    return `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>חוזה מנוי - AlgoTouch</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 900px;
            margin: 0 auto;
            padding: 20px;
          }
          .contract-header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 1px solid #eee;
            padding-bottom: 20px;
          }
          .signature-section {
            margin-top: 40px;
            border-top: 1px solid #eee;
            padding-top: 20px;
          }
          .signature-img {
            max-width: 300px;
            border: 1px solid #ddd;
            margin: 10px 0;
          }
          .metadata {
            margin-top: 30px;
            font-size: 0.9em;
            color: #666;
          }
        </style>
      </head>
      <body>
        <div class="contract-header">
          <h1>הסכם מנוי - AlgoTouch</h1>
          <p>גרסת הסכם: ${contractVersion}</p>
        </div>
        
        <div class="contract-body">
          ${htmlParagraphs}
        </div>
        
        <div class="signature-section">
          <h3>פרטי החותם:</h3>
          <p><strong>שם מלא:</strong> ${name}</p>
          <p><strong>דוא"ל:</strong> ${userEmail}</p>
          ${phone ? `<p><strong>טלפון:</strong> ${phone}</p>` : ''}
          ${idNumber ? `<p><strong>ת.ז.:</strong> ${idNumber}</p>` : ''}
          
          <h3>חתימה:</h3>
          <img src="${sig}" alt="חתימה דיגיטלית" class="signature-img" />
          
          <div class="metadata">
            <p><strong>תאריך ושעת חתימה:</strong> ${hebrewDate}</p>
            <p><strong>מזהה מסמך:</strong> ${Date.now().toString(36)}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  };

  const clearSignature = () => {
    setSignature('');
  };

  return (
    <div className="space-y-6">
      <ContractDisplay contractText={contractText} />
      
      <Card className="mt-6">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">פרטי החותם</h3>
          
          <ContractMetadata
            fullName={fullName}
            onFullNameChange={setFullName}
            email={email}
            onEmailChange={setEmail}
            phone={phone}
            onPhoneChange={setPhone}
            idNumber={idNumber}
            onIdNumberChange={setIdNumber}
          />
          
          <Separator className="my-6" />
          
          <h3 className="text-lg font-semibold mb-4">חתימה דיגיטלית</h3>
          <div className="mb-4 border rounded-md p-1">
            <EnhancedSignaturePad
              value={signature}
              onChange={setSignature}
              width={400}
              height={200}
              maxWidth={600}
              responsiveWidth={true}
            />
          </div>
          
          <div className="flex justify-end mb-6">
            <Button variant="outline" size="sm" onClick={clearSignature}>
              נקה חתימה
            </Button>
          </div>
          
          <ContractAgreement
            agreedToTerms={agreedToTerms}
            agreedToPrivacy={agreedToPrivacy}
            onTermsChange={setAgreedToTerms}
            onPrivacyChange={setAgreedToPrivacy}
          />
          
          <Button 
            className="mt-6 w-full" 
            size="lg"
            onClick={handleSign}
            disabled={!signature || !agreedToTerms || !agreedToPrivacy || !fullName || !email}
          >
            אישור וחתימה
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DigitalContractForm;
