
import React, { useEffect, useState, useRef } from 'react';
import { Shield, CreditCard, Lock } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CardData {
  cardNumber: string;
  cardholderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

interface CardcomOpenFieldsProps {
  onTokenReceived: (tokenData: any) => void;
  onError: (error: any) => void;
  isProcessing: boolean;
}

declare global {
  interface Window {
    Cardcom?: {
      tokenize: (cardData: any, callback: (response: any) => void) => void;
      initValidityChecker: (options: any) => void;
      checkValidity: (cardType: string, cardValue: string) => boolean;
      validateCardNumber: (cardNumber: string, callback: (response: any) => void) => void;
      validateExpiry: (month: string, year: string) => boolean;
      validateCVV: (cvv: string) => boolean;
    };
  }
}

const CardcomOpenFields: React.FC<CardcomOpenFieldsProps> = ({
  onTokenReceived,
  onError,
  isProcessing
}) => {
  const [cardData, setCardData] = useState<CardData>({
    cardNumber: '',
    cardholderName: '',
    expiryMonth: '',
    expiryYear: '',
    cvv: ''
  });
  
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof CardData, string>>>({});
  const [isCardcomLoaded, setIsCardcomLoaded] = useState(false);
  const cardcomScriptRef = useRef<HTMLScriptElement | null>(null);

  // Load the Cardcom SDK
  useEffect(() => {
    if (!cardcomScriptRef.current) {
      const script = document.createElement('script');
      script.src = 'https://secure.cardcom.solutions/ClientApi/cardcom.min.js';
      script.async = true;
      script.onload = () => {
        console.log('Cardcom SDK loaded');
        setIsCardcomLoaded(true);
        
        // Initialize Cardcom validity checker if available
        if (window.Cardcom && window.Cardcom.initValidityChecker) {
          window.Cardcom.initValidityChecker({
            // Configuration options if needed
          });
        }
      };
      script.onerror = () => {
        console.error('Failed to load Cardcom SDK');
        setIsCardcomLoaded(false);
        onError(new Error('Failed to load payment processing SDK'));
      };
      
      document.body.appendChild(script);
      cardcomScriptRef.current = script;
    }
    
    return () => {
      // Cleanup if component unmounts before script loads
      if (cardcomScriptRef.current && !isCardcomLoaded) {
        document.body.removeChild(cardcomScriptRef.current);
      }
    };
  }, []);

  // Format card number with spaces for better readability
  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
    const matches = v.match(/\d{4,16}/g);
    const match = matches && matches[0] || '';
    const parts = [];
    
    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4));
    }
    
    if (parts.length) {
      return parts.join(' ');
    } else {
      return value;
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'cardNumber') {
      setCardData({ ...cardData, [name]: formatCardNumber(value) });
    } else if (name === 'expiry') {
      // Parse MM/YY format
      const expiry = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
      
      if (expiry.length <= 2) {
        setCardData({ ...cardData, expiryMonth: expiry, expiryYear: '' });
      } else {
        setCardData({ 
          ...cardData, 
          expiryMonth: expiry.substring(0, 2), 
          expiryYear: expiry.substring(2, 4) 
        });
      }
    } else {
      setCardData({ ...cardData, [name]: value });
    }
    
    // Clear error when typing
    if (formErrors[name as keyof CardData]) {
      setFormErrors({ ...formErrors, [name]: '' });
    }
  };

  // Format expiry date as MM/YY
  const formatExpiryDate = () => {
    if (!cardData.expiryMonth) return '';
    
    if (cardData.expiryYear) {
      return `${cardData.expiryMonth}/${cardData.expiryYear}`;
    }
    
    return cardData.expiryMonth;
  };

  // Validate the card data
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof CardData, string>> = {};
    let isValid = true;

    // Validate card number
    const cleanCardNumber = cardData.cardNumber.replace(/\s/g, '');
    if (!cleanCardNumber || cleanCardNumber.length < 14 || cleanCardNumber.length > 19) {
      errors.cardNumber = 'מספר כרטיס לא תקין';
      isValid = false;
    } else if (window.Cardcom && window.Cardcom.checkValidity) {
      // Use Cardcom validation if available
      const isCardValid = window.Cardcom.checkValidity('card', cleanCardNumber);
      if (!isCardValid) {
        errors.cardNumber = 'מספר כרטיס לא תקין';
        isValid = false;
      }
    }

    // Validate cardholder name
    if (!cardData.cardholderName || cardData.cardholderName.trim().length < 2) {
      errors.cardholderName = 'יש להזין שם מלא';
      isValid = false;
    }

    // Validate expiry date
    if (!cardData.expiryMonth || cardData.expiryMonth.length !== 2) {
      errors.expiryMonth = 'חודש לא תקין';
      isValid = false;
    } else if (parseInt(cardData.expiryMonth) < 1 || parseInt(cardData.expiryMonth) > 12) {
      errors.expiryMonth = 'חודש לא תקין';
      isValid = false;
    }

    if (!cardData.expiryYear || cardData.expiryYear.length !== 2) {
      errors.expiryYear = 'שנה לא תקינה';
      isValid = false;
    } else {
      const currentYear = new Date().getFullYear() % 100;
      const currentMonth = new Date().getMonth() + 1;
      const expiryYear = parseInt(cardData.expiryYear);
      const expiryMonth = parseInt(cardData.expiryMonth);
      
      if (expiryYear < currentYear || 
          (expiryYear === currentYear && expiryMonth < currentMonth)) {
        errors.expiryYear = 'הכרטיס פג תוקף';
        isValid = false;
      }
    }

    // Validate CVV
    if (!cardData.cvv || cardData.cvv.length < 3 || cardData.cvv.length > 4) {
      errors.cvv = 'קוד אבטחה לא תקין';
      isValid = false;
    }

    setFormErrors(errors);
    return isValid;
  };

  // Process payment using Cardcom tokenization
  const processPayment = () => {
    if (!validateForm()) {
      toast.error('אנא תקן את השגיאות בטופס');
      return;
    }

    if (!isCardcomLoaded || !window.Cardcom || !window.Cardcom.tokenize) {
      toast.error('מערכת התשלומים לא זמינה כרגע, אנא נסה שוב מאוחר יותר');
      onError(new Error('Cardcom SDK not loaded properly'));
      return;
    }

    try {
      // Prepare data for tokenization
      const tokenizeData = {
        card: cardData.cardNumber.replace(/\s/g, ''),
        cvv: cardData.cvv,
        month: cardData.expiryMonth,
        year: cardData.expiryYear,
        holder: cardData.cardholderName
      };

      // Call Cardcom tokenize function
      window.Cardcom.tokenize(tokenizeData, (response) => {
        console.log('Tokenization response:', response);
        
        if (response.status === 'ok' && response.token) {
          // Success - pass token to parent component
          const tokenInfo = {
            token: response.token,
            lastFourDigits: cardData.cardNumber.slice(-4),
            expiryMonth: cardData.expiryMonth,
            expiryYear: cardData.expiryYear,
            cardholderName: cardData.cardholderName
          };
          
          onTokenReceived(tokenInfo);
        } else {
          // Handle error
          console.error('Tokenization failed:', response);
          onError(response.error || new Error('Failed to process payment information'));
          toast.error(response.message || 'אירעה שגיאה בעיבוד פרטי התשלום');
        }
      });
    } catch (error) {
      console.error('Error during tokenization:', error);
      onError(error);
      toast.error('אירעה שגיאה בעיבוד פרטי התשלום');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-muted/50 p-3 rounded-md border flex items-start gap-2 mb-2">
        <Shield className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
        <p className="text-sm">
          שדות התשלום מאובטחים. פרטי כרטיס האשראי שלך לא נשמרים בשרת שלנו אלא מומרים לטוקן מאובטח.
        </p>
      </div>
      
      <div className="space-y-4">
        {/* Card Number */}
        <div className="space-y-2">
          <Label htmlFor="cardNumber" className="flex items-center gap-1">
            <CreditCard className="h-4 w-4" /> מספר כרטיס
          </Label>
          <Input
            id="cardNumber"
            name="cardNumber"
            dir="ltr"
            placeholder="0000 0000 0000 0000"
            value={cardData.cardNumber}
            onChange={handleInputChange}
            className={`text-left font-medium text-lg tracking-wider ${formErrors.cardNumber ? 'border-destructive' : ''}`}
            autoComplete="cc-number"
            maxLength={19}
          />
          {formErrors.cardNumber && (
            <p className="text-sm text-destructive">{formErrors.cardNumber}</p>
          )}
        </div>
        
        {/* Cardholder Name */}
        <div className="space-y-2">
          <Label htmlFor="cardholderName">שם בעל הכרטיס</Label>
          <Input
            id="cardholderName"
            name="cardholderName"
            placeholder="ישראל ישראלי"
            value={cardData.cardholderName}
            onChange={handleInputChange}
            className={`${formErrors.cardholderName ? 'border-destructive' : ''}`}
            autoComplete="cc-name"
          />
          {formErrors.cardholderName && (
            <p className="text-sm text-destructive">{formErrors.cardholderName}</p>
          )}
        </div>
        
        <div className="flex flex-row gap-4">
          {/* Expiry Date */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="expiry">תוקף</Label>
            <Input
              id="expiry"
              name="expiry"
              dir="ltr"
              placeholder="MM/YY"
              value={formatExpiryDate()}
              onChange={handleInputChange}
              className={`text-left ${formErrors.expiryMonth || formErrors.expiryYear ? 'border-destructive' : ''}`}
              autoComplete="cc-exp"
              maxLength={5}
            />
            {(formErrors.expiryMonth || formErrors.expiryYear) && (
              <p className="text-sm text-destructive">{formErrors.expiryMonth || formErrors.expiryYear}</p>
            )}
          </div>
          
          {/* CVV */}
          <div className="space-y-2 flex-1">
            <Label htmlFor="cvv" className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> קוד אבטחה (CVV)
            </Label>
            <Input
              id="cvv"
              name="cvv"
              dir="ltr"
              type="password"
              placeholder="123"
              value={cardData.cvv}
              onChange={handleInputChange}
              className={`text-left ${formErrors.cvv ? 'border-destructive' : ''}`}
              autoComplete="cc-csc"
              maxLength={4}
            />
            {formErrors.cvv && (
              <p className="text-sm text-destructive">{formErrors.cvv}</p>
            )}
          </div>
        </div>
      </div>
      
      <Button
        className="w-full mt-4"
        onClick={processPayment}
        disabled={isProcessing || !isCardcomLoaded}
      >
        {isProcessing ? (
          <>
            <span className="animate-spin mr-2">&#9696;</span>
            מעבד תשלום...
          </>
        ) : "בצע תשלום"}
      </Button>

      <div className="flex items-center justify-center mt-2 text-xs text-muted-foreground gap-1">
        <Lock className="h-3 w-3" />
        <span>מאובטח ע"י Cardcom</span>
      </div>
    </div>
  );
};

export default CardcomOpenFields;
