
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Check, FileText } from 'lucide-react';

interface DigitalContractFormProps {
  onSign: () => void;
  planId: string;
  fullName: string;
}

const DigitalContractForm: React.FC<DigitalContractFormProps> = ({
  onSign,
  planId,
  fullName,
}) => {
  const [signature, setSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);

  // Get registration data from session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      const data = JSON.parse(storedData);
      setRegistrationData(data);
      
      // If user data is available, set fullName from it
      if (data.userData && data.userData.firstName && data.userData.lastName) {
        const generatedFullName = `${data.userData.firstName} ${data.userData.lastName}`;
        setSignature(generatedFullName);
      }
    }
  }, []);

  const planName = planId === 'annual' ? 'שנתי' : 'חודשי';
  const planPrice = planId === 'annual' ? '899' : '99';
  
  const handleSign = async () => {
    if (!signature || !agreedToTerms || !agreedToPrivacy) {
      return;
    }
    
    try {
      setIsSigningInProgress(true);
      
      // Store signing information in session storage
      if (registrationData) {
        const updatedData = {
          ...registrationData,
          contractSigned: true,
          contractSignedAt: new Date().toISOString(),
          signature,
          planId
        };
        sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
      }
      
      // This would be replaced with an actual API call to Izidoc or similar service
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulating API call
      
      onSign();
    } catch (error) {
      console.error('Error signing contract:', error);
    } finally {
      setIsSigningInProgress(false);
    }
  };

  return (
    <Card className="max-w-3xl mx-auto glass-card-2025" dir="rtl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <FileText className="h-6 w-6 text-primary" />
          <CardTitle>הסכם שימוש במערכת</CardTitle>
        </div>
        <CardDescription>נא לקרוא את כל תנאי ההסכם לפני החתימה</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border rounded-md p-4 h-80 overflow-y-auto bg-card/50 text-sm">
          <h3 className="font-bold text-lg">הסכם שימוש - מערכת TraderVue</h3>
          <p className="my-2">מסמך זה מהווה הסכם מחייב בין המשתמש/ת לבין TraderVue.</p>
          
          <h4 className="font-bold mt-4">תנאי המנוי</h4>
          <p>אתה נרשם למנוי {planName} בסך {planPrice}₪ לתקופה.</p>
          <p>המנוי יחל עם חודש ניסיון חינם, לאחריו יחל חיוב אוטומטי.</p>
          <p>ניתן לבטל את המנוי בכל עת באמצעות פנייה לשירות הלקוחות.</p>
          
          <h4 className="font-bold mt-4">שירותים</h4>
          <p>TraderVue מספקת שירותי ניהול מסחר, יומן מסחר וקורסים.</p>
          <p>השירותים מסופקים "כפי שהם" (AS IS) ללא התחייבות לזמינות או רווחיות.</p>
          
          <h4 className="font-bold mt-4">תשלומים וחיובים</h4>
          <p>לאחר חודש הניסיון החינמי, תחויב באופן אוטומטי בהתאם למסלול שבחרת.</p>
          <p>ניתן לבטל את המנוי בכל עת ללא קנסות.</p>
          
          <h4 className="font-bold mt-4">פרטיות</h4>
          <p>אנו אוספים מידע בהתאם למדיניות הפרטיות שלנו.</p>
          <p>המידע משמש לשיפור השירות וחוויית המשתמש.</p>
          
          <h4 className="font-bold mt-4">סיום ההסכם</h4>
          <p>TraderVue שומרת את הזכות להפסיק את השירות למשתמשים הפוגעים בתנאי השימוש.</p>
          <p>ביטול מנוי ייכנס לתוקפו בסוף תקופת החיוב הנוכחית.</p>
          
          <p className="mt-6 text-muted-foreground">מסמך זה עודכן לאחרונה בתאריך 01.01.2025</p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox id="terms" checked={agreedToTerms} onCheckedChange={() => setAgreedToTerms(!agreedToTerms)} />
            <Label htmlFor="terms" className="text-sm">
              קראתי והסכמתי לתנאי השימוש המפורטים לעיל
            </Label>
          </div>
          
          <div className="flex items-center space-x-2 space-x-reverse">
            <Checkbox id="privacy" checked={agreedToPrivacy} onCheckedChange={() => setAgreedToPrivacy(!agreedToPrivacy)} />
            <Label htmlFor="privacy" className="text-sm">
              קראתי והסכמתי למדיניות הפרטיות
            </Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="signature">חתימה דיגיטלית (הקלד את שמך המלא)</Label>
            <Textarea 
              id="signature" 
              placeholder="ישראל ישראלי" 
              value={signature} 
              onChange={(e) => setSignature(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              הקלדת שמך המלא מהווה חתימה דיגיטלית מחייבת
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSign}
          disabled={!signature || !agreedToTerms || !agreedToPrivacy || isSigningInProgress}
          className="w-full gap-2"
        >
          {isSigningInProgress ? (
            'מבצע חתימה...'
          ) : (
            <>
              <Check className="h-4 w-4" />
              חתום והמשך
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DigitalContractForm;
