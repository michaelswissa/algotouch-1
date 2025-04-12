
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ContractAgreementProps {
  plan: string;
  onAccept: (accepted: boolean) => void;
  onBack: () => void;
}

const ContractAgreement: React.FC<ContractAgreementProps> = ({ 
  plan,
  onAccept, 
  onBack 
}) => {
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showError, setShowError] = useState(false);

  const getPlanName = () => {
    switch(plan) {
      case 'monthly': return 'חודשי';
      case 'annual': return 'שנתי';
      case 'vip': return 'VIP';
      default: return 'חודשי';
    }
  };

  const handleContinue = () => {
    if (agreedToTerms && agreedToPrivacy) {
      setShowError(false);
      onAccept(true);
    } else {
      setShowError(true);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-center">הסכם שירות למנוי {getPlanName()}</h2>
      
      {showError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            יש לאשר את תנאי השירות ומדיניות הפרטיות להמשך התהליך
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardContent className="pt-6">
          <div className="max-h-80 overflow-y-auto p-2 border rounded mb-4">
            <h3 className="text-lg font-semibold mb-4">הסכם שירות</h3>
            <p className="mb-4">ברוכים הבאים למערכת TraderVue. הסכם זה מגדיר את התנאים וההגבלות לשימוש בשירותי המערכת.</p>
            
            <h4 className="font-medium mb-2">1. תנאי שימוש</h4>
            <p className="mb-3">השימוש במערכת TraderVue כפוף לתנאים המפורטים בהסכם זה. המשתמש מצהיר כי קרא והבין את תנאי ההסכם ומסכים לפעול על פיהם.</p>
            
            <h4 className="font-medium mb-2">2. מנוי {getPlanName()}</h4>
            <p className="mb-3">המנוי {getPlanName()} מאפשר גישה לכלל תכונות המערכת בהתאם לתנאי המנוי שנבחר, לתקופה המוגדרת בתכנית.</p>
            
            <h4 className="font-medium mb-2">3. תשלומים</h4>
            <p className="mb-3">התשלום עבור המנוי יבוצע מראש, בהתאם לתכנית שנבחרה. התשלום אינו ניתן להחזר, למעט במקרים המפורטים בהסכם זה.</p>
            
            <h4 className="font-medium mb-2">4. ביטול מנוי</h4>
            <p className="mb-3">ניתן לבטל את המנוי בכל עת באמצעות פנייה לשירות הלקוחות. ביטול המנוי לא יזכה בהחזר כספי עבור התקופה שלא נוצלה, אלא במקרים חריגים ובהתאם לשיקול דעת החברה.</p>
            
            <h4 className="font-medium mb-2">5. שינויים בשירות</h4>
            <p className="mb-3">החברה שומרת לעצמה את הזכות לשנות את תנאי השירות בכל עת, לרבות מחירים, תכונות ותכניות מנוי. הודעה על שינויים אלה תימסר למשתמשים באמצעות האתר או בדואר אלקטרוני.</p>
            
            <h4 className="font-medium mb-2">6. הגבלת אחריות</h4>
            <p className="mb-3">השימוש במערכת TraderVue הינו באחריות המשתמש בלבד. החברה אינה אחראית לכל נזק ישיר או עקיף שעלול להיגרם כתוצאה משימוש במערכת.</p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox 
                id="terms" 
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked === true)}
              />
              <label
                htmlFor="terms"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                אני מסכימ/ה לתנאי השימוש
              </label>
            </div>
            
            <div className="flex items-center space-x-2 space-x-reverse">
              <Checkbox 
                id="privacy" 
                checked={agreedToPrivacy}
                onCheckedChange={(checked) => setAgreedToPrivacy(checked === true)}
              />
              <label
                htmlFor="privacy"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                אני מאשר/ת את מדיניות הפרטיות
              </label>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex justify-between mt-6">
        <Button variant="outline" onClick={onBack}>
          חזור
        </Button>
        <Button onClick={handleContinue}>
          אני מסכימ/ה לתנאים
        </Button>
      </div>
    </div>
  );
};

export default ContractAgreement;
