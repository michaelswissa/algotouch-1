
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
          <h3 className="font-bold text-lg mb-2">הסכם רישיון תוכנה</h3>
          <p className="my-2">מסמך זה מהווה הסכם משפטי לרישיון תוכנה (להלן: "ההסכם") בין חברת אלגוטאצ' טכנולוגיות בע"מ, ח.פ. 517043808, מרחוב איילון 4ג', חדרה (להלן: "החברה"), לבין כל אדם או תאגיד הרוכש או עושה שימוש בתוכנת החברה (להלן: "המשתמש"). השימוש בתוכנה כפוף לתנאי ההסכם – התקנה או שימוש בתוכנה מהווים אישור והסכמה מצד המשתמש לכל תנאיו. אם המשתמש אינו מסכים לתנאים המפורטים להלן, עליו להימנע מהתקנת התוכנה או משימוש בה בכל דרך שהיא.</p>
          
          <h4 className="font-bold mt-4">1. הענקת רישיון</h4>
          <p>1.1 רישיון מוגבל – בכפוף לתנאי ההסכם, החברה מעניקה בזאת למשתמש רישיון מוגבל, בלתי-בלעדי, בלתי ניתן להעברה ואישי להתקין ולהשתמש בתוכנה, בהתאם לייעודה ובכפוף לכל תנאי ההסכם. רישיון זה ניתן לשימושו הפנימי של המשתמש בלבד ובהתאם לחבילת הרישוי שרכש (כהגדרתה להלן).</p>
          <p>1.2 אין בהענקת הרישיון משום מכר – התוכנה ניתנת ברישיון לשימוש מוגבל ואינה נמכרת למשתמש. כל הזכויות בתוכנה ייוותרו בבעלות החברה (או בעלי זכויות אחרים, לפי העניין), והמשתמש מקבל אך ורק את זכות השימוש המוגבלת כמפורט בהסכם זה.</p>
          
          <h4 className="font-bold mt-4">2. זכויות קניין רוחני</h4>
          <p>2.1 בעלות החברה בתוכנה – כל זכויות הקניין הרוחני בתוכנה ובכל רכיביה, לרבות קוד המקור והקוד הבינארי, קוד הקוד, עיצוב, אלגוריתמים, מסדי נתונים, ממשקי משתמש, תכנים, שיפורים, עדכונים, שדרוגים, תיעוד נלווה, סימני מסחר, לוגואים וסודות מסחריים (בין אם רשומים ובין אם לאו) – היו ועודם בכל עת בבעלות המלאה והבלעדית של החברה ו/או ספקי הרישיון שלה. שום זכות, בעלות או חלק בזכויות אלה אינו מועבר למשתמש במסגרת הסכם זה, למעט הזכות המפורשת להשתמש בתוכנה בהתאם לרישיון המוגבל המוענק בהסכם.</p>
          
          <h4 className="font-bold mt-4">3. הגבלות שימוש</h4>
          <p>המשתמש מתחייב לעשות שימוש בתוכנה אך ורק בהתאם לרישיון ובהתאם לכל דין, ולמטרות חוקיות. מבלי לגרוע מכלליות האמור, ובכפוף להוראות דין שלא ניתן להתנות עליהן, המשתמש מתחייב שלא לבצע את הפעולות הבאות ללא הרשאה מפורשת מראש ובכתב מהחברה:</p>
          <p>העתקה והפצה בלתי מורשית – לא להעתיק, לשכפל, להפיץ, למכור, לשווק, להשאיל, להשכיר, להחכיר, לתת רישיון משנה (Sub-license) או למסור לצד שלישי את התוכנה או חלקים ממנה, למעט העתקה לצרכי התקנה ושימוש מורשה בתוכנה על פי הסכם זה, והפקת עותק גיבוי יחיד לצרכי התאוששות.</p>
          <p>שינוי וקוד מקור – לא לערוך שינוי, תיקון, הנדסה חוזרת, הידור חוזר, פירוק או Reverse Engineering של התוכנה או כל חלק ממנה, ולא לנסות לגלות את קוד המקור של התוכנה או ליצור יצירה נגזרת ממנה, אלא אם וככל שהדבר הותר במפורש לפי דין קוגנטי שאינו ניתן להתניה.</p>
          
          <h4 className="font-bold mt-4">4. תנאי רישיון, תשלום ואספקה</h4>
          <p>4.1 חבילות רישוי – החברה רשאית להציע את התוכנה במתכונת של חבילות או רמות רישיון שונות (לדוגמה: גרסה בסיסית, מקצועית, ארגונית וכיו"ב), העשויות להשתנות בהיקף הפונקציונליות, במספר המשתמשים המורשים, במשך הרישיון או בכל פרמטר אחר.</p>
          <p>4.2 דמי רישיון ותשלומים – אתה נרשם למנוי {planName} בסך {planPrice}₪ לתקופה. המנוי יחל עם חודש ניסיון חינם, לאחריו יחל חיוב אוטומטי.</p>
          
          <h4 className="font-bold mt-4">5. עדכונים, שדרוגים ותמיכה</h4>
          <p>5.1 עדכוני תוכנה – החברה רשאית, לפי שיקול דעתה, לפתח ולהפיץ מעת לעת גרסאות מתוקנות או משופרות של התוכנה, לרבות תיקוני באגים, שיפורי אבטחה, עדכונים שוטפים או שדרוגים בעלי פונקציונליות חדשה.</p>
          
          <h4 className="font-bold mt-4">6. תקופת ההסכם, חידוש וביטול</h4>
          <p>6.1 תקופת הרישיון – תקופת הרישיון תיקבע בהתאם לסוג ולחבילת הרישיון שרכש המשתמש. ניתן לבטל את המנוי בכל עת באמצעות פנייה לשירות הלקוחות.</p>
          
          <h4 className="font-bold mt-4">12. אי-ייעוץ או ניהול השקעות; אחריות המשתמש</h4>
          <p>12.1 המשתמש מצהיר ומאשר כי ידוע לו שהחברה אינה בעלת רישיון ייעוץ השקעות, שיווק השקעות או ניהול תיקי השקעות, וכי היא אינה מספקת לו שירותי ייעוץ השקעות, המלצות להשקעה, שיווק השקעות, ניהול תיק השקעות או כל שירות אחר המחייב רישוי לפי דין.</p>
          
          <h4 className="font-bold mt-4">13. פרטיות ואבטחת מידע</h4>
          <p>13.1 איסוף ושימוש במידע – המשתמש מאשר ומסכים שהחברה רשאית לאסוף, לשמור ולעבד מידע הנוגע למשתמש ולעשיית שימוש בתוכנה, לרבות מידע אישי שמסר המשתמש במסגרת רכישת הרישיון או השימוש בתוכנה.</p>
          
          <p className="mt-6 text-muted-foreground">מסמך זה עודכן לאחרונה בתאריך 01.04.2025</p>
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
