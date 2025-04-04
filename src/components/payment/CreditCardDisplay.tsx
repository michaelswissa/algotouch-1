
import React, { useState, useEffect } from 'react';
import styles from '@/styles/CreditCardAnimation.module.css';
import { CreditCard as CreditCardIcon } from 'lucide-react';

// Logo components
const VisaLogo = () => (
  <img 
    src="/lovable-uploads/f1d6477c-2100-4767-81b2-0f2241da8676.png" 
    alt="Visa" 
    className="h-8 w-auto"
  />
);

const MastercardLogo = () => (
  <svg className="h-8 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="255.4" cy="235.5" r="179.5" fill="#D9222A"/>
    <circle cx="495.5" cy="235.5" r="179.5" fill="#EE9F2D"/>
    <path d="M375.4,135c33.6,27.1,55.1,68.9,55.1,115.6c0,46.6-21.5,88.4-55.1,115.6c-33.6-27.1-55.1-68.9-55.1-115.6 C320.3,203.9,341.8,162.1,375.4,135z" fill="#D9222A" opacity="0.8"/>
  </svg>
);

const AmexLogo = () => (
  <svg className="h-8 w-auto" viewBox="0 0 750 471" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M0,41h750v390H0V41z" fill="#2557D6"/>
    <path 
      d="M327.9,243l-11.6-29.4l-11.4,29.4H327.9z M524.1,280.1h26l-29.4-71.5h-21.5l-29.1,71.5h26l5.5-14.4h18.1 L524.1,280.1z M395.8,208.6l17.3,41.8h-18.3L395.8,208.6z M402.5,280.1h24.8l3.4-9.4h29.2l3.7,9.4h26.7l-27.5-71.5h-25.9 L402.5,280.1z M614.9,208.6l14.1,41.8h-15.7L614.9,208.6z M620.7,280.1h28.3l5.5-15h21.1l5.8,15h26.7l-27.5-71.5h-32.4 L620.7,280.1z M191.9,280.1h30.6v-18.1h33.3v-14.9h-33.3v-9h40v-16.5h-70.7V280.1z M321.9,280.1h30.6v-18.1h33.3v-14.9h-33.3v-9 h40v-16.5h-70.7V280.1z M487.8,208.6v13.8h28.7v58h24.7v-58h28.8v-13.8H487.8z M674.4,208.6v13.8h28.7v58h24.7v-58h28.8v-13.8 H674.4z M148,221.2c8.3,0,13.1,4.3,13.1,11.2c0,7-4.8,11.2-13.1,11.2h-30.6v-22.4H148z M98.5,280.1h19v-19.5h29.5 c17.7,0,31.3-9.9,31.3-29.1c0-19.1-12.5-29.9-30.2-29.9H98.5V280.1z" 
      fill="#ffffff"
    />
  </svg>
);

interface CreditCardDisplayProps {
  cardNumber: string;
  cardholderName: string;
  expiryDate: string;
  cvv: string;
  onFlip?: (flipped: boolean) => void;
}

const CreditCardDisplay: React.FC<CreditCardDisplayProps> = ({
  cardNumber,
  cardholderName,
  expiryDate,
  cvv,
  onFlip
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [cardType, setCardType] = useState('');
  const [preloadClass, setPreloadClass] = useState(styles.preload);
  const [cardDesign, setCardDesign] = useState('cardCustomImage');
  
  // Remove preload class after initial render to enable animations
  useEffect(() => {
    const timer = setTimeout(() => {
      setPreloadClass('');
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Automatically flip card when focusing on CVV and flip back when focusing other fields
  useEffect(() => {
    if (onFlip) {
      onFlip(isFlipped);
    }
  }, [isFlipped, onFlip]);
  
  useEffect(() => {
    setIsFlipped(Boolean(cvv));
  }, [cvv]);
  
  // Detect card type from number and set appropriate design
  useEffect(() => {
    const detectedType = detectCardType(cardNumber);
    if (detectedType !== cardType) {
      setCardType(detectedType);
      
      // Set card design based on card type
      if (detectedType === 'visa') {
        setCardDesign('cardCustomImage');
      } else if (detectedType === 'mastercard') {
        setCardDesign('cardRed');
      } else if (detectedType === 'amex') {
        setCardDesign('cardGreen');
      } else if (detectedType === 'discover') {
        setCardDesign('cardPurple');
      } else {
        // Default design
        setCardDesign('cardBlue');
      }
    }
  }, [cardNumber, cardType]);
  
  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };
  
  const detectCardType = (number: string): string => {
    const cleanNumber = number.replace(/\D/g, '');
    if (cleanNumber === '') return '';
    
    // Basic regex patterns for card type detection
    const visaPattern = /^4/;
    const mastercardPattern = /^5[1-5]/;
    const amexPattern = /^3[47]/;
    const discoverPattern = /^6(?:011|5)/;
    
    if (visaPattern.test(cleanNumber)) return 'visa';
    if (mastercardPattern.test(cleanNumber)) return 'mastercard';
    if (amexPattern.test(cleanNumber)) return 'amex';
    if (discoverPattern.test(cleanNumber)) return 'discover';
    
    return 'unknown';
  };
  
  // Format display values with proper spacing and masking
  const formatCardNumber = () => {
    if (!cardNumber || cardNumber.trim() === '') return (
      <>
        <span>xxxx</span>
        <span>xxxx</span>
        <span>xxxx</span>
        <span>xxxx</span>
      </>
    );
    
    // Display with proper format
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    
    // Format based on card type (AMEX uses 4-6-5 format, others use 4-4-4-4)
    if (cardType === 'amex') {
      // Create groups for AMEX (4-6-5)
      const group1 = cleanNumber.slice(0, 4).padEnd(4, 'x');
      const group2 = cleanNumber.slice(4, 10).padEnd(6, 'x');
      const group3 = cleanNumber.slice(10, 15).padEnd(5, 'x');
      
      return (
        <>
          <span>{group1}</span>
          <span>{group2}</span>
          <span>{group3}</span>
        </>
      );
    } else {
      // Create groups for other cards (4-4-4-4)
      const group1 = cleanNumber.slice(0, 4).padEnd(4, 'x');
      const group2 = cleanNumber.slice(4, 8).padEnd(4, 'x');
      const group3 = cleanNumber.slice(8, 12).padEnd(4, 'x');
      const group4 = cleanNumber.slice(12, 16).padEnd(4, 'x');
      
      return (
        <>
          <span>{group1}</span>
          <span>{group2}</span>
          <span>{group3}</span>
          <span>{group4}</span>
        </>
      );
    }
  };
  
  const formatName = () => {
    return cardholderName || 'YOUR NAME HERE';
  };
  
  const formatExpiry = () => {
    if (!expiryDate || expiryDate.trim() === '') return 'MM/YY';
    return expiryDate;
  };
  
  // Render card logo based on type
  const renderCardLogo = () => {
    switch (cardType) {
      case 'visa':
        return <VisaLogo />;
      case 'mastercard':
        return <MastercardLogo />;
      case 'amex':
        return <AmexLogo />;
      default:
        return <CreditCardIcon className="text-white h-8 w-auto" />;
    }
  };
  
  return (
    <div className={`${styles.container} ${preloadClass}`}>
      <div 
        className={`${styles.creditcard} ${isFlipped ? styles.flipped : ''}`} 
        onClick={flipCard}
      >
        {/* Front of card */}
        <div className={`${styles.front} ${styles[cardDesign]}`}>
          <div className={styles.cardContent}>
            <div className="flex justify-between items-start">
              {/* Chip */}
              <div className={styles.cardChip}>
                <div className={styles.chipLines}>
                  <div className={styles.chipLine}></div>
                  <div className={styles.chipLine}></div>
                  <div className={styles.chipLine}></div>
                  <div className={styles.chipLine}></div>
                </div>
                <div className={styles.chipContact}></div>
              </div>
              
              {/* Card Logo */}
              <div className={styles.ccsingle}>
                {renderCardLogo()}
              </div>
            </div>
            
            {/* Card Number */}
            <div className={styles.cardNumber}>
              {formatCardNumber()}
            </div>
            
            {/* Cardholder & Expiry */}
            <div className={styles.cardInfo}>
              <div className={styles.cardholderInfo}>
                <div className={styles.cardholderLabel}>Card Holder</div>
                <div className={styles.cardholderName}>{formatName()}</div>
              </div>
              
              <div className={styles.cardExpiryBox}>
                <div className={styles.expiryLabel}>Expires</div>
                <div className={styles.expiryValue}>{formatExpiry()}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Back of card */}
        <div className={`${styles.back} ${styles[cardDesign]}`}>
          <div className={styles.cardContent}>
            <div className={styles.cardStripe}></div>
            
            <div className={styles.cardCvvLabel}>Security Code</div>
            <div className={styles.cardCvv}>{cvv || '***'}</div>
            
            <div className="flex justify-end mt-auto mb-5">
              <div className={styles.ccsingle}>
                {renderCardLogo()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditCardDisplay;
