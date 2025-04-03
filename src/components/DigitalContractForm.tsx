
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Check, FileText, Download, ArrowDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import SignaturePad from './signature/SignaturePad';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/auth';

interface DigitalContractFormProps {
  onSign: (contractData: any) => void;
  planId: string;
  fullName: string;
}

const DigitalContractForm: React.FC<DigitalContractFormProps> = ({
  onSign,
  planId,
  fullName,
}) => {
  // Form state
  const [userDetails, setUserDetails] = useState({
    fullName: fullName || '',
    address: '',
    idNumber: '',
    phone: '',
    email: '',
  });
  const [signature, setSignature] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [isSigningInProgress, setIsSigningInProgress] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [registrationData, setRegistrationData] = useState<any>(null);
  const [contractVersion] = useState('1.0');
  const contractRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Get registration data from session storage
  useEffect(() => {
    const storedData = sessionStorage.getItem('registration_data');
    if (storedData) {
      const data = JSON.parse(storedData);
      setRegistrationData(data);
      
      // If user data is available, populate form fields
      if (data.userData) {
        setUserDetails(prev => ({
          ...prev,
          fullName: data.userData.firstName && data.userData.lastName 
            ? `${data.userData.firstName} ${data.userData.lastName}` 
            : prev.fullName,
          email: data.email || prev.email
        }));
      }
    }
  }, []);

  // Handle contract scroll to detect when user has read the entire document
  const handleContractScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Check if scrolled to bottom (with a small margin)
    if (scrollHeight - scrollTop - clientHeight < 30) {
      setScrolledToBottom(true);
    }
  };

  // Get browser information for audit purposes
  const getBrowserInfo = () => {
    return {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      screenSize: `${window.screen.width}x${window.screen.height}`,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  };

  // Generate HTML content of the contract
  const getContractHtml = () => {
    return contractRef.current?.innerHTML || '';
  };

  // Handle form submission and signing process
  const handleSign = async () => {
    if (!userDetails.fullName || !signature || !agreedToTerms || !agreedToPrivacy || !scrolledToBottom) {
      toast({
        title: "לא ניתן להשלים את החתימה",
        description: !scrolledToBottom 
          ? "יש לקרוא את ההסכם במלואו ולגלול עד לסופו" 
          : "יש למלא את כל השדות הנדרשים ולהסכים לתנאים",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsSigningInProgress(true);
      console.log("Preparing contract data for signing...");
      
      // Store signing information in session storage for continued registration flow
      if (registrationData) {
        const updatedData = {
          ...registrationData,
          contractSigned: true,
          contractSignedAt: new Date().toISOString(),
          signature,
          planId,
          userData: {
            ...registrationData.userData,
            fullName: userDetails.fullName,
            address: userDetails.address,
            idNumber: userDetails.idNumber,
            phone: userDetails.phone,
            email: userDetails.email || registrationData.email
          }
        };
        sessionStorage.setItem('registration_data', JSON.stringify(updatedData));
      }

      // Prepare contract data for passing to parent component
      const contractData = {
        userId: user?.id,
        fullName: userDetails.fullName,
        address: userDetails.address,
        idNumber: userDetails.idNumber,
        phone: userDetails.phone,
        email: userDetails.email || user?.email,
        signature,
        contractVersion,
        contractHtml: getContractHtml(),
        agreedToTerms,
        agreedToPrivacy,
        browserInfo: getBrowserInfo()
      };
      
      console.log("Calling onSign with contract data", {
        fullName: contractData.fullName,
        hasSignature: Boolean(contractData.signature),
        hasContractHtml: Boolean(contractData.contractHtml),
        contractVersion: contractData.contractVersion,
      });
      
      // Call the onSign callback with the contract data
      if (typeof onSign === 'function') {
        onSign(contractData);
      } else {
        console.error("onSign is not a function", onSign);
        toast({
          title: "שגיאה בתהליך החתימה",
          description: "אירעה שגיאה בעת ביצוע החתימה. אנא נסה שנית",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error signing contract:', error);
      toast({
        title: "שגיאה בתהליך החתימה",
        description: "אירעה שגיאה בעת ביצוע החתימה. אנא נסה שנית",
        variant: "destructive"
      });
    } finally {
      setIsSigningInProgress(false);
    }
  };

  // Allow user to download the contract - making this a separate function
  // that will be called explicitly rather than automatically
  const downloadContract = () => {
    const contractContent = contractRef.current?.innerHTML;
    if (!contractContent) return;
    
    // Get browser info for the footer
    const browserInfo = getBrowserInfo();
    const ipAddress = registrationData?.ipAddress || "לא זוהה";
    const currentDate = new Date().toLocaleString('he-IL');
    
    const blob = new Blob([`
      <html>
        <head>
          <title>הסכם התקשרות - ${userDetails.fullName}</title>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; direction: rtl; padding: 20px; }
            h3, h4 { margin-top: 20px; }
            .signature { margin-top: 30px; border-top: 1px solid #ccc; padding-top: 10px; }
            .browser-info { margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <h2>הסכם התקשרות</h2>
          <p>נחתם ביום: ${new Date().toLocaleDateString('he-IL')}</p>
          ${contractContent}
          <div class="signature">
            <p>שם מלא: ${userDetails.fullName}</p>
            <p>כתובת: ${userDetails.address}</p>
            <p>ת.ז./ח.פ: ${userDetails.idNumber}</p>
            <p>טלפון: ${userDetails.phone}</p>
            <p>דואר אלקטרוני: ${userDetails.email}</p>
            ${signature ? `<img src="${signature}" alt="חתימה דיגיטלית" style="max-width: 300px; border: 1px solid #eee; margin-top: 10px;" />` : ''}
            <p>מועד החתימה: ${new Date().toLocaleString('he-IL')}</p>
          </div>
          <div class="browser-info">
            <h4>מידע טכני על החתימה:</h4>
            <p>כתובת IP: ${ipAddress}</p>
            <p>דפדפן: ${browserInfo.userAgent}</p>
            <p>שפת דפדפן: ${browserInfo.language}</p>
            <p>פלטפורמה: ${browserInfo.platform}</p>
            <p>רזולוציית מסך: ${browserInfo.screenSize}</p>
            <p>אזור זמן: ${browserInfo.timeZone}</p>
            <p>תאריך ושעה: ${currentDate}</p>
          </div>
        </body>
      </html>
    `], { type: 'text/html' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `הסכם-התקשרות-${userDetails.fullName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle input change for user details
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserDetails(prev => ({
      ...prev,
      [name]: value
    }));
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
        <div className="relative">
          <div 
            ref={contractRef}
            className="border rounded-md p-4 h-80 overflow-y-auto bg-card/50 text-sm scroll-smooth"
            onScroll={handleContractScroll}
          >
            <h3 className="font-bold text-lg mb-2">הסכם רישיון תוכנה</h3>
            <p className="my-2">מסמך זה מהווה הסכם משפטי לרישיון תוכנה (להלן: "ההסכם") בין חברת אלגוטאצ' טכנולוגיות בע"מ, ח.פ. 517043808, מרחוב איילון 4ג', חדרה (להלן: "החברה"), לבין כל אדם או תאגיד הרוכש או עושה שימוש בתוכנת החברה (להלן: "המשתמש"). השימוש בתוכנה כפוף לתנאי ההסכם – התקנה או שימוש בתוכנה מהווים אישור והסכמה מצד המשתמש לכל תנאיו. אם המשתמש אינו מסכים לתנאים המפורטים להלן, עליו להימנע מהתקנת התוכנה או משימוש בה בכל דרך שהיא.</p>
            
            <h4 className="font-bold mt-4 text-primary">1. הענקת רישיון</h4>
            <p><strong>1.1 רישיון מוגבל</strong> – בכפוף לתנאי ההסכם, החברה מעניקה בזאת למשתמש רישיון מוגבל, בלתי-בלעדי, בלתי ניתן להעברה ואישי להתקין ולהשתמש בתוכנה, בהתאם לייעודה ובכפוף לכל תנאי ההסכם. רישיון זה ניתן לשימושו הפנימי של המשתמש בלבד ובהתאם לחבילת הרישוי שרכש (כהגדרתה להלן).</p>
            <p><strong>1.2 אין בהענקת הרישיון משום מכר</strong> – התוכנה ניתנת ברישיון לשימוש מוגבל ואינה נמכרת למשתמש. כל הזכויות בתוכנה ייוותרו בבעלות החברה (או בעלי זכויות אחרים, לפי העניין), והמשתמש מקבל אך ורק את זכות השימוש המוגבלת כמפורט בהסכם זה.</p>
            
            <h4 className="font-bold mt-4 text-primary">2. זכויות קניין רוחני</h4>
            <p><strong>2.1 בעלות החברה בתוכנה</strong> – כל זכויות הקניין הרוחני בתוכנה ובכל רכיביה, לרבות קוד המקור והקוד הבינארי, קוד הקוד, עיצוב, אלגוריתמים, מסדי נתונים, ממשקי משתמש, תכנים, שיפורים, עדכונים, שדרוגים, תיעוד נלווה, סימני מסחר, לוגואים וסודות מסחריים (בין אם רשומים ובין אם לאו) – היו ועודם בכל עת בבעלות המלאה והבלעדית של החברה ו/או ספקי הרישיון שלה. שום זכות, בעלות או חלק בזכויות אלה אינו מועבר למשתמש במסגרת הסכם זה, למעט הזכות המפורשת להשתמש בתוכנה בהתאם לרישיון המוגבל המוענק בהסכם.</p>
            <p><strong>2.2 איסור פגיעה בזכויות</strong> – המשתמש מתחייב שלא לבצע, ולא לאפשר לאחר לבצע, כל פעולה העלולה לפגוע בזכויות הקניין הרוחני של החברה בתוכנה. בכלל זה, ומבלי לגרוע מכלליות האמור, חל איסור מוחלט על המשתמש להעתיק, להפיץ, לשכפל, לשנות, לעבד, לתרגם, ליצור יצירות נגזרות, להעמיד לרשות הציבור, או להשתמש בתוכנה או בכל חלק ממנה, בכל אופן החורג מן המותר בהסכם זה.</p>
            <p><strong>2.3 הודעות והגבלות</strong> – המשתמש לא יסיר, יטשטש או ישנה כל סימן, כיתוב או הודעת זכויות יוצרים, סימן מסחר, לוגו או הודעת קניין רוחני אחרת המופיעים בתוכנה או בחומריה הנלווים. כל התיעוד, המדריכים, הקבצים והחומרים הנלווים שהתוכנה או החברה מעמידה לרשות המשתמש ייחשבו כחלק מהתוכנה, וכפופים להגבלות ולהגנת זכויות הקניין הרוחני כאמור.</p>
            <p><strong>2.4 משוב ושיפורים</strong> – כל משוב, רעיון, הצעה לשיפור, דיווח על באגים או מידע אחר שהמשתמש מוסר לחברה בקשר לתוכנה יהיה לקניין החברה. המשתמש מסכים ומאשר שכל זכות, לרבות זכות קניין רוחני, במשוב כאמור תועבר לחברה, והחברה רשאית להשתמש בו, לשלב אותו בתוכנה או במוצרים אחרים, או ליישמו בכל אופן שהוא – והכול ללא הגבלה, תשלום או תמורה למשתמש.</p>
            
            <h4 className="font-bold mt-4 text-primary">3. הגבלות שימוש</h4>
            <p>המשתמש מתחייב לעשות שימוש בתוכנה אך ורק בהתאם לרישיון ובהתאם לכל דין, ולמטרות חוקיות. מבלי לגרוע מכלליות האמור, ובכפוף להוראות דין שלא ניתן להתנות עליהן, המשתמש מתחייב שלא לבצע את הפעולות הבאות ללא הרשאה מפורשת מראש ובכתב מהחברה:</p>
            <p><strong>העתקה והפצה בלתי מורשית</strong> – לא להעתיק, לשכפל, להפיץ, למכור, לשווק, להשאיל, להשכיר, להחכיר, לתת רישיון משנה (Sub-license) או למסור לצד שלישי את התוכנה או חלקים ממנה, למעט העתקה לצרכי התקנה ושימוש מורשה בתוכנה על פי הסכם זה, והפקת עותק גיבוי יחיד לצרכי התאוששות.</p>
            <p><strong>שינוי וקוד מקור</strong> – לא לערוך שינוי, תיקון, הנדסה חוזרת, הידור חוזר, פירוק או Reverse Engineering של התוכנה או כל חלק ממנה, ולא לנסות לגלות את קוד המקור של התוכנה או ליצור יצירה נגזרת ממנה, אלא אם וככל שהדבר הותר במפורש לפי דין קוגנטי שאינו ניתן להתניה.</p>
            <p><strong>חריגה מהיקף הרישיון</strong> – לא להשתמש בתוכנה בהיקף או באופן החורג מההרשאות שנרכשו. בין היתר, המשתמש לא יאפשר שימוש בתוכנה ליותר משתמשים, עמדות קצה, אתרים או התקנים מכפי שהותר במסגרת חבילת הרישיון שרכש; ולא יאפשר שימוש בפונקציות, רכיבים או מודולים מעבר לאלה הכלולים בחבילה שרכש, אלא לאחר שדרוג רישיון ותשלום התוספת המתאימה.</p>
            <p><strong>שימוש בלתי חוקי או מזיק</strong> – לא לעשות שימוש בתוכנה לצורך כל פעולה בלתי חוקית, בלתי מורשית, או כזו העלולה להזיק לחברה או לכל צד שלישי. בכלל זה, המשתמש לא ישתמש בתוכנה באופן המפר כל דין, תקנה או צו שיפוטי, או כל זכות של צד שלישי – לרבות (אך לא רק) זכויות קניין רוחני של צדדים שלישיים, זכויות פרטיות, או דינים בתחום אבטחת המידע. כמו כן, המשתמש לא ישתמש בתוכנה באופן שעלול לגרום לפגיעה, שיבוש, נזק, השבתה או עומס יתר על שרתי החברה או על התוכנה עצמה.</p>
            <p><strong>מנגנוני הגנה</strong> – לא לעקוף, לנטרל, לשבש או להסיר כל אמצעי אבטחה, הצפנה, בקרת שימוש או מנגנון הגנה אחר הכלול בתוכנה. המשתמש לא ינסה לעקוף מגבלות טכניות בתוכנה או לבצע פעולה שנועדה לאפשר שימוש בתוכנה בדרך שאינה מורשית במפורש בהסכם זה.</p>
            <p>הפרת סעיף 3 (על תתי-סעיפיו) תהווה הפרה יסודית ומהותית של ההסכם. במקרה של הפרה כאמור, בנוסף לכל סעד אחר על פי דין, החברה תהיה רשאית לבטל לאלתר את הרישיון ואת זכות השימוש של המשתמש בתוכנה, מבלי שהדבר יגרע מחובותיו והתחייבויותיו של המשתמש (לרבות חובת התשלום עבור הרישיון במלואו), ומבלי לגרוע מכל תרופה אחרת העומדת לחברה לפי דין.</p>
            
            <h4 className="font-bold mt-4 text-primary">4. תנאי רישיון, תשלום ואספקה</h4>
            <p><strong>4.1 חבילות רישוי</strong> – החברה רשאית להציע את התוכנה במתכונת של חבילות או רמות רישיון שונות (לדוגמה: גרסה בסיסית, מקצועית, ארגונית וכיו"ב), העשויות להשתנות בהיקף הפונקציונליות, במספר המשתמשים המורשים, במשך הרישיון או בכל פרמטר אחר. זכויות השימוש שהוענקו למשתמש מוגבלות לחבילה ולתנאים כפי שנרכשו על ידו ואושרו על-ידי החברה. על המשתמש לוודא כי היקף הרישיון שרכש תואם את צרכיו, וכי אינו עושה שימוש החורג מכך (כאמור בסעיף 3 לעיל).</p>
            <p><strong>4.2 דמי רישיון ותשלומים</strong> – אתה נרשם למנוי {planId === 'annual' ? 'שנתי' : 'חודשי'} בסך {planId === 'annual' ? '899' : '99'}₪ לתקופה. המנוי יחל עם חודש ניסיון חינם, לאחריו יחל חיוב אוטומטי.</p>
            <p><strong>4.3 מדיניות החזרים</strong> – אלא אם צוין במפורש אחרת בכתב על-ידי החברה או כנדרש על פי דין, דמי הרישיון אינם ניתנים להחזרה. המשתמש מאשר ומסכים כי לא תהיה לו זכות לקבלת החזר כספי עבור תשלומים ששילם, בין אם החליט להפסיק להשתמש בתוכנה לפני תום תקופת הרישיון ובין אם מכל סיבה אחרת, למעט במקרים בהם החוק מחייב החזר או שהחברה, לפי שיקול דעתה, החליטה להעניק החזר כאמור. למען הסר ספק, אם וככל שהמשתמש הוא "צרכן" הזכאי לבטל את עסקת רכישת הרישיון בהתאם לחוק הגנת הצרכן ותקנותיו (למשל בעסקת מכר מרחוק בתוך המועדים הקבועים בדין), יבוטלו העסקה ודמי הרישיון יוחזרו בכפוף ובהתאם להוראות הדין (ובכלל זה זכות החברה לגבות דמי ביטול בשיעור המותר בחוק).</p>
            <p><strong>4.4 פיגור בתשלום</strong> – אי-תשלום במועדו של כל סכום המגיע לחברה על פי הסכם זה ייחשב כהפרה מהותית של ההסכם. במקרה של פיגור או מחדל תשלומים, תהיה החברה רשאית, מבלי לגרוע מכל סעד אחר העומד לרשותה, להשהות או לחסום את גישת המשתמש לתוכנה, לבטל לאלתר את הרישיון שניתן, ולדרוש מהמשתמש לשלם את כל סכום הפיגורים בתוספת ריבית והפרשי הצמדה כפי שמותר על פי דין. כמו כן, המשתמש ישפה את החברה על כל הוצאה שתיגרם לה לצורך גביית החוב, לרבות הוצאות משפט ושכר טרחת עורכי דין.</p>
            <p><strong>4.5 שינויים בתנאי הרישוי</strong> – החברה שומרת לעצמה את הזכות לעדכן מעת לעת את מחירי הרישיון, מבנה החבילות או תנאי התשלום, בהתאם לצורכי העסק ושיקול דעתה. לגבי רישיונות מתחדשים, תמסור החברה למשתמש הודעה מראש (לדוגמה, בדוא"ל הרשום במערכת) על כל שינוי מהותי כאמור לפני מועד החידוש הבא. במקרה של שינוי בתנאי הרישיון או במחירו, יהיה המשתמש רשאי לבחור אם לחדש את הרישיון בהתאם לתנאים החדשים בתום התקופה הנוכחית, או לבטל את החידוש לפני כניסת התנאים החדשים לתוקף. היעדר התנגדות או אי-ביטול מצד המשתמש ייחשבו להסכמה לתנאים המעודכנים החל ממועד החידוש.</p>
            <p><strong>4.6 אספקת התוכנה</strong> – אלא אם סוכם אחרת, אספקת התוכנה תתבצע באמצעות הורדה דיגיטלית מאתר החברה או באמצעות קישור שיועבר למשתמש לאחר השלמת תהליך הרכישה והתשלום. ייתכן כי השימוש בתוכנה מצריך מפתח רישיון, קוד הפעלה או הרשמה מקוונת; במקרה כזה, תספק החברה למשתמש את פרטי הגישה או מפתחות הרישיון הדרושים, והמשתמש אחראי לשמור עליהם בסודיות (כמפורט בסעיף 3 לעיל בדבר איסור עקיפת אמצעי הגנה). החברה לא תישא באחריות לאובדן, דליפה או שימוש לרעה במפתחות הרישיון שנמסרו למשתמש.</p>
            
            <h4 className="font-bold mt-4 text-primary">5. עדכונים, שדרוגים ותמיכה</h4>
            <p><strong>5.1 עדכוני תוכנה</strong> – החברה רשאית, לפי שיקול דעתה, לפתח ולהפיץ מעת לעת גרסאות מתוקנות או משופרות של התוכנה, לרבות תיקוני באגים, שיפורי אבטחה, עדכונים שוטפים או שדרוגים בעלי פונקציונליות חדשה.</p>
          </div>
          {scrolledToBottom ? (
            <div className="absolute bottom-2 right-2 bg-green-100 text-green-800 rounded-full p-1">
              <Check className="h-4 w-4" />
            </div>
          ) : (
            <div className="absolute bottom-2 right-2 animate-bounce">
              <ArrowDown className="h-5 w-5 text-primary" />
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">פרטי החותם</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">שם מלא</Label>
              <Input
                id="fullName"
                name="fullName"
                value={userDetails.fullName}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">כתובת</Label>
              <Input
                id="address"
                name="address"
                value={userDetails.address}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="idNumber">מספר ת.ז / ח.פ</Label>
              <Input
                id="idNumber"
                name="idNumber"
                value={userDetails.idNumber}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">טלפון</Label>
              <Input
                id="phone"
                name="phone"
                value={userDetails.phone}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="email">דואר אלקטרוני</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={userDetails.email}
                onChange={handleInputChange}
                required
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">חתימה דיגיטלית</h3>
            <SignaturePad onChange={setSignature} />
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-2 space-x-reverse">
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  אני מאשר/ת שקראתי את התנאים וההגבלות של ההסכם
                </label>
              </div>
            </div>
            
            <div className="flex items-start space-x-2 space-x-reverse">
              <Checkbox
                id="privacy"
                checked={agreedToPrivacy}
                onCheckedChange={(checked) => setAgreedToPrivacy(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="privacy"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  אני מאשר/ת את מדיניות הפרטיות
                </label>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button 
          variant="outline" 
          type="button"
          className="flex items-center gap-2"
          onClick={downloadContract}
        >
          <Download className="h-4 w-4" />
          הורדת עותק מההסכם
        </Button>
        
        <Button 
          onClick={handleSign}
          disabled={isSigningInProgress || !scrolledToBottom || !signature || !agreedToTerms || !agreedToPrivacy}
          className="flex items-center gap-2"
        >
          {isSigningInProgress ? "מעבד..." : "חתום על ההסכם"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default DigitalContractForm;
